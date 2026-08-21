import json
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import logging
from concurrent.futures import ThreadPoolExecutor
from app.core.supabase import get_supabase
from app.core.config import settings
from app.services.pooling_service import get_pool_settings, assign_invoice_to_pool

logger = logging.getLogger(__name__)

# Primary model (cross-region Claude 3.5 Sonnet v2)
PRIMARY_MODEL_ID = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
# Fallback model (Claude 3 Haiku — cheaper, more widely available)
FALLBACK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
REGION = "us-east-1"


def _get_bedrock_client():
    """Creates a Bedrock Runtime client with explicit credentials from settings."""
    kwargs = {
        "service_name": "bedrock-runtime",
        "region_name": settings.aws_region or REGION,
        "config": Config(connect_timeout=10, read_timeout=30, retries={"max_attempts": 2}),
    }
    # Explicitly pass credentials if available in settings
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client(**kwargs)


def _invoke_bedrock(system_prompt: str, user_prompt: str) -> dict:
    """Invokes Claude via Bedrock Runtime and returns parsed JSON.
    Tries the primary model first; falls back to Haiku on access errors."""
    client = _get_bedrock_client()
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
        "temperature": 0.0,
    }

    # Try primary model, then fallback
    for model_id in [PRIMARY_MODEL_ID, FALLBACK_MODEL_ID]:
        try:
            response = client.invoke_model(modelId=model_id, body=json.dumps(body))
            response_body = json.loads(response.get("body").read())
            content = response_body.get("content", [])[0].get("text", "")

            # Minimal JSON extraction to handle markdown wrappers
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            return json.loads(content)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("AccessDeniedException", "ValidationException") and model_id == PRIMARY_MODEL_ID:
                logger.warning(f"Primary model {model_id} unavailable ({error_code}), falling back to {FALLBACK_MODEL_ID}")
                continue
            logger.error(f"Bedrock invocation failed for {model_id}: {e}")
            return {"error": str(e), "is_fallback": True}
        except Exception as e:
            logger.error(f"Bedrock invocation failed for {model_id}: {e}")
            return {"error": str(e), "is_fallback": True}

    return {"error": "All models failed", "is_fallback": True}


def _log_agent_run(invoice_id: str, pool_id: str, agent_name: str, input_data: dict, output_data: dict, recommendation: str, confidence: float):
    try:
        db = get_supabase()
        db.table("agent_runs").insert({
            "invoice_id": invoice_id,
            "pool_id": pool_id,
            "agent_name": agent_name,
            "input": input_data,
            "output": output_data,
            "recommendation": recommendation,
            "confidence": confidence
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log agent run: {e}")


def run_invoice_agent(invoice: dict) -> dict:
    system = "You are the Invoice Validation Agent. Evaluate the provided invoice JSON for plausibility (tenor, amount). Return ONLY valid JSON with keys: 'is_plausible' (boolean), 'reasoning' (string), and 'confidence' (number 0-100)."
    output = _invoke_bedrock(system, json.dumps(invoice))
    
    # Fallback default
    if output.get("is_fallback"):
        output = {"is_plausible": True, "reasoning": "Fallback due to LLM error", "confidence": 50.0, "is_fallback": True}

    _log_agent_run(
        invoice_id=invoice.get("id"),
        pool_id=None,
        agent_name="invoice",
        input_data=invoice,
        output_data=output,
        recommendation="plausible" if output.get("is_plausible") else "flagged",
        confidence=output.get("confidence")
    )
    return output


def run_compliance_agent(invoice: dict) -> dict:
    system = "You are the Compliance Agent. Check if the exporter's invoice exposure is compliant with typical SME forward limits. Return ONLY valid JSON with keys: 'compliance_status' ('approved', 'flagged', 'rejected'), 'reasoning' (string), and 'confidence' (number 0-100)."
    output = _invoke_bedrock(system, json.dumps(invoice))
    
    if output.get("is_fallback"):
        output = {"compliance_status": "not_checked", "reasoning": "Fallback due to LLM error", "confidence": 50.0, "is_fallback": True}

    _log_agent_run(
        invoice_id=invoice.get("id"),
        pool_id=None,
        agent_name="compliance",
        input_data=invoice,
        output_data=output,
        recommendation=output.get("compliance_status"),
        confidence=output.get("confidence")
    )
    return output


def run_bank_routing_agent(invoice: dict) -> dict:
    db = get_supabase()
    
    # 1. Fetch eligible banks (status='active', currency in supported_currencies)
    banks_res = db.table("banks").select("*").eq("status", "active").contains("supported_currencies", [invoice["currency"]]).execute()
    banks = banks_res.data
    
    if not banks:
        # Fallback to no bank if none configured
        return {"bank_id": None, "reasoning": "No eligible banks found", "confidence": 0, "is_fallback": True}

    # 2. Fetch capacity for these banks
    bank_ids = [b["id"] for b in banks]
    capacity_res = db.table("bank_capacity").select("*").in_("bank_id", bank_ids).eq("currency", invoice["currency"]).execute()
    capacities = capacity_res.data

    input_data = {
        "invoice": invoice,
        "banks": banks,
        "capacities": capacities
    }
    
    system = "You are the Bank Routing Agent. Choose a bank from the provided list based on available headroom (max_exposure - current_exposure). Return ONLY valid JSON with keys: 'bank_id' (string), 'reasoning' (string), and 'confidence' (number 0-100)."
    output = _invoke_bedrock(system, json.dumps(input_data))
    
    if output.get("is_fallback") or not output.get("bank_id") or not any(b["id"] == output["bank_id"] for b in banks):
        # Deterministic fallback: bank with most headroom
        best_bank_id = banks[0]["id"]
        max_headroom = -99999999
        for cap in capacities:
            headroom = float(cap["max_exposure"]) - float(cap["current_exposure"])
            if headroom > max_headroom:
                max_headroom = headroom
                best_bank_id = cap["bank_id"]
        
        output = {
            "bank_id": best_bank_id,
            "reasoning": "Fallback routing to bank with maximum capacity headroom",
            "confidence": 0,
            "is_fallback": True
        }

    _log_agent_run(
        invoice_id=invoice.get("id"),
        pool_id=None,
        agent_name="bank_routing",
        input_data=input_data,
        output_data=output,
        recommendation=output.get("bank_id"),
        confidence=output.get("confidence")
    )
    return output


def run_pooling_agent(invoice: dict, bank_id: str) -> dict:
    # 1. Fetch candidate pools (status='collecting', same currency, same bank)
    db = get_supabase()
    res = db.table("pools").select("*").eq("status", "collecting").eq("currency", invoice["currency"]).eq("bank_id", bank_id).execute()
    
    # Filter candidate pools to ensure the invoice due date is within the pool's bucket
    due_date = invoice["due_date"]
    candidate_pools = [
        p for p in res.data 
        if p["bucket_start_date"] <= due_date <= p["bucket_end_date"]
    ]

    input_data = {
        "invoice": invoice,
        "candidate_pools": candidate_pools,
        "settings": get_pool_settings(invoice["currency"])
    }

    system = "You are the Pooling Agent. Decide whether to assign the invoice to one of the candidate pools (return its 'id'), or create a new pool (return 'new'). Return ONLY valid JSON with keys: 'action' ('assign' or 'new'), 'pool_id' (string or null), 'reasoning' (string), and 'confidence' (number 0-100)."
    output = _invoke_bedrock(system, json.dumps(input_data))

    if output.get("is_fallback"):
        output = {"action": "fallback", "pool_id": None, "reasoning": "Fallback", "confidence": 0, "is_fallback": True}

    # Execute the action via the deterministic service logic
    assigned_pool = None
    if output.get("action") == "assign" and output.get("pool_id"):
        # Verify pool_id exists in candidates
        if any(p["id"] == output["pool_id"] for p in candidate_pools):
            from app.services.pooling_service import assign_to_existing_pool
            assigned_pool = assign_to_existing_pool(invoice, output["pool_id"])
    
    if not assigned_pool:
        # Fallback or "new" action: use the standard logic which creates a new pool if no exact match
        assigned_pool = assign_invoice_to_pool(invoice, bank_id)

    _log_agent_run(
        invoice_id=invoice.get("id"),
        pool_id=assigned_pool["id"],
        agent_name="pooling",
        input_data=input_data,
        output_data=output,
        recommendation=f"Assigned to {assigned_pool['id']}",
        confidence=output.get("confidence")
    )
    return assigned_pool


def run_risk_agent(invoice: dict, pool: dict) -> dict:
    input_data = {"invoice": invoice, "pool": pool}
    system = "You are the Risk Agent. Evaluate the risk of the resulting pool now that this invoice is added (volatility, concentration). Return ONLY valid JSON with keys: 'risk_score' (number 1-100), 'reasoning' (string), and 'confidence' (number 0-100)."
    output = _invoke_bedrock(system, json.dumps(input_data))

    if output.get("is_fallback"):
        output = {"risk_score": None, "reasoning": "Fallback", "confidence": 50.0, "is_fallback": True}

    _log_agent_run(
        invoice_id=invoice.get("id"),
        pool_id=pool.get("id"),
        agent_name="risk",
        input_data=input_data,
        output_data=output,
        recommendation=str(output.get("risk_score")),
        confidence=output.get("confidence")
    )
    return output


def run_execution_agent(pool: dict):
    from app.services.rate_service import compute_indicative_forward_rate
    from app.services.settlement_service import execute_pool
    from datetime import date
    
    db = get_supabase()
    invoices = db.table("invoices").select("exporter_confirmed, compliance_status").eq("pool_id", pool["id"]).execute().data or []
    
    # Check safety valve conditions
    if any(inv.get("compliance_status") == "rejected" for inv in invoices) or any(not inv.get("exporter_confirmed") for inv in invoices):
        logger.info(f"Execution Agent aborted for pool {pool['id']} due to failed compliance/confirmation checks.")
        return None
        
    mid_date = date.fromisoformat(pool["bucket_end_date"])
    locked_rate = compute_indicative_forward_rate(pool["currency"], mid_date)
    return execute_pool(pool["id"], locked_rate)


def run_agent_pipeline(invoice: dict) -> dict:
    """Orchestrator: Runs the agent fan-out pipeline on a new invoice."""
    
    # 1. Parallel execution of Invoice and Compliance agents
    with ThreadPoolExecutor(max_workers=2) as executor:
        f_invoice = executor.submit(run_invoice_agent, invoice)
        f_compliance = executor.submit(run_compliance_agent, invoice)
        
        invoice_assessment = f_invoice.result()
        compliance_assessment = f_compliance.result()
        
    compliance_status = compliance_assessment.get("compliance_status", "flagged")

    # 2. Bank Routing Agent
    bank_routing = run_bank_routing_agent(invoice)
    bank_id = bank_routing.get("bank_id")

    # 3. Pooling Agent
    assigned_pool = run_pooling_agent(invoice, bank_id)

    # 4. Risk Agent (on the pool level)
    risk_assessment = run_risk_agent(invoice, assigned_pool)
    risk_score = risk_assessment.get("risk_score")

    # Orchestrator logging
    _log_agent_run(
        invoice_id=invoice.get("id"),
        pool_id=assigned_pool.get("id"),
        agent_name="orchestrator",
        input_data={"invoice_id": invoice.get("id")},
        output_data={"compliance": compliance_status, "risk": risk_score, "pool_id": assigned_pool.get("id")},
        recommendation="Pipeline Complete",
        confidence=100.0
    )

    return {
        "compliance_status": compliance_status,
        "risk_score": risk_score,
        "pool": assigned_pool,
        "routing_confidence": bank_routing.get("confidence"),
        "routing_reasoning": bank_routing.get("reasoning"),
    }
