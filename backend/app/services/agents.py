import json
import boto3
import logging
from concurrent.futures import ThreadPoolExecutor
from app.core.supabase import get_supabase
from app.core.config import settings
from app.services.pooling_service import get_pool_settings, assign_invoice_to_pool

logger = logging.getLogger(__name__)

MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
REGION = "us-east-1"


def _invoke_bedrock(system_prompt: str, user_prompt: str) -> dict:
    """Invokes Claude Haiku via Bedrock Runtime and returns parsed JSON."""
    try:
        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region or REGION,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 512,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.0,
        }
        response = client.invoke_model(modelId=MODEL_ID, body=json.dumps(body))
        response_body = json.loads(response.get("body").read())
        content = response_body.get("content", [])[0].get("text", "")

        # Minimal JSON extraction to handle markdown wrappers
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        return json.loads(content)
    except Exception as e:
        logger.error(f"Bedrock invocation failed: {e}")
        return {"error": str(e), "is_fallback": True}


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
        output = {"is_plausible": True, "reasoning": "Fallback due to LLM error", "confidence": 50.0}

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
        output = {"compliance_status": "approved", "reasoning": "Fallback due to LLM error", "confidence": 50.0}

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


def run_pooling_agent(invoice: dict) -> dict:
    # 1. Fetch candidate pools (status='collecting', same currency)
    db = get_supabase()
    res = db.table("pools").select("*").eq("status", "collecting").eq("currency", invoice["currency"]).execute()
    candidate_pools = res.data

    input_data = {
        "invoice": invoice,
        "candidate_pools": candidate_pools,
        "settings": get_pool_settings(invoice["currency"])
    }

    system = "You are the Pooling Agent. Decide whether to assign the invoice to one of the candidate pools (return its 'id'), or create a new pool (return 'new'). Return ONLY valid JSON with keys: 'action' ('assign' or 'new'), 'pool_id' (string or null), 'reasoning' (string), and 'confidence' (number 0-100)."
    output = _invoke_bedrock(system, json.dumps(input_data))

    if output.get("is_fallback"):
        output = {"action": "fallback", "pool_id": None, "reasoning": "Fallback", "confidence": 0}

    # Execute the action via the deterministic service logic
    assigned_pool = None
    if output.get("action") == "assign" and output.get("pool_id"):
        # Verify pool_id exists in candidates
        if any(p["id"] == output["pool_id"] for p in candidate_pools):
            from app.services.pooling_service import assign_to_existing_pool
            assigned_pool = assign_to_existing_pool(invoice, output["pool_id"])
    
    if not assigned_pool:
        # Fallback or "new" action: use the standard logic which creates a new pool if no exact match
        assigned_pool = assign_invoice_to_pool(invoice)

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
        output = {"risk_score": 25.0, "reasoning": "Fallback", "confidence": 50.0}

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


def run_agent_pipeline(invoice: dict) -> dict:
    """Orchestrator: Runs the agent fan-out pipeline on a new invoice."""
    
    # 1. Parallel execution of Invoice and Compliance agents
    with ThreadPoolExecutor(max_workers=2) as executor:
        f_invoice = executor.submit(run_invoice_agent, invoice)
        f_compliance = executor.submit(run_compliance_agent, invoice)
        
        invoice_assessment = f_invoice.result()
        compliance_assessment = f_compliance.result()
        
    compliance_status = compliance_assessment.get("compliance_status", "flagged")

    # 2. Pooling Agent
    assigned_pool = run_pooling_agent(invoice)

    # 3. Risk Agent (on the pool level)
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
        "pool": assigned_pool
    }
