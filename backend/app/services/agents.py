import json
import logging
from concurrent.futures import ThreadPoolExecutor
from app.core.supabase import get_supabase
from app.core.config import settings
from app.services.eligibility import (
    filter_eligible_pools,
    sanitize_pools_for_ai,
    deterministic_rank,
    validate_ai_recommendation,
)
from app.services.pooling_service import list_bank_pools

logger = logging.getLogger(__name__)

MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
REGION = "us-east-1"


def _invoke_bedrock(system_prompt: str, user_prompt: str) -> dict:
    try:
        import boto3

        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region or REGION,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 700,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.0,
        }
        response = client.invoke_model(modelId=MODEL_ID, body=json.dumps(body))
        response_body = json.loads(response.get("body").read())
        content = response_body.get("content", [])[0].get("text", "")

        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        return json.loads(content)
    except Exception as e:
        logger.error("Bedrock invocation failed: %s", e)
        return {"error": str(e), "is_fallback": True}


def _log_agent_run(invoice_id, pool_id, agent_name, input_data, output_data, recommendation, confidence):
    if not invoice_id:
        return
    try:
        db = get_supabase()
        db.table("agent_runs").insert(
            {
                "invoice_id": invoice_id,
                "pool_id": pool_id,
                "agent_name": agent_name,
                "input": input_data,
                "output": output_data,
                "recommendation": recommendation,
                "confidence": confidence,
            }
        ).execute()
    except Exception as e:
        logger.error("Failed to log agent run: %s", e)


def run_document_agent(invoice: dict) -> dict:
    text = (invoice.get("document_text") or "").strip()
    if not text:
        return {"extracted": False, "fields": {}}

    system = (
        "You are the Document Agent. Extract invoice fields from the text. "
        "Return ONLY JSON with keys: invoice_number, amount (number), currency (ISO 3-letter), "
        "due_date (YYYY-MM-DD), issue_date (YYYY-MM-DD or null), buyer_name, buyer_country, payment_terms, confidence (0-100)."
    )
    output = _invoke_bedrock(system, text[:8000])
    if output.get("is_fallback"):
        output = {"extracted": False, "fields": {}, "is_fallback": True}
    _log_agent_run(invoice.get("id"), None, "document", {"len": len(text)}, output, "extracted", output.get("confidence") or 0)
    return output


def run_invoice_agent(invoice: dict) -> dict:
    system = (
        "You are the Invoice Validation Agent. Evaluate the invoice JSON for plausibility (tenor, amount). "
        "Return ONLY JSON with keys: is_plausible (boolean), reasoning (string), confidence (number 0-100)."
    )
    payload = {k: invoice.get(k) for k in ("id", "amount", "currency", "due_date", "buyer_name", "invoice_number")}
    output = _invoke_bedrock(system, json.dumps(payload))
    if output.get("is_fallback"):
        output = {"is_plausible": True, "reasoning": "Fallback due to LLM error", "confidence": 50.0}
    _log_agent_run(
        invoice.get("id"), None, "invoice", payload, output,
        "plausible" if output.get("is_plausible") else "flagged",
        output.get("confidence"),
    )
    return output


def run_compliance_agent(invoice: dict) -> dict:
    system = (
        "You are the Compliance Agent. Check SME forward-limit plausibility. "
        "Return ONLY JSON with keys: compliance_status ('approved','flagged','rejected'), reasoning, confidence (0-100)."
    )
    payload = {k: invoice.get(k) for k in ("id", "amount", "currency", "due_date", "buyer_country")}
    output = _invoke_bedrock(system, json.dumps(payload))
    if output.get("is_fallback"):
        output = {"compliance_status": "approved", "reasoning": "Fallback due to LLM error", "confidence": 50.0}
    _log_agent_run(
        invoice.get("id"), None, "compliance", payload, output,
        output.get("compliance_status"), output.get("confidence"),
    )
    return output


def run_matching_agent(invoice: dict, eligible_pools: list[dict], bank: dict | None) -> dict:
    """AI recommends among already-eligible pools. Never assigns. Never sees other banks' pools."""
    compact = sanitize_pools_for_ai(eligible_pools)
    eligible_ids = {str(p["id"]) for p in eligible_pools}

    if not compact:
        return {
            "recommended_pool_id": None,
            "match_score": 0,
            "reason": "No eligible pools at this bank for this invoice.",
            "alternatives": [],
            "source": "none",
        }

    input_data = {
        "invoice": {
            "id": invoice.get("id"),
            "amount": invoice.get("amount"),
            "currency": invoice.get("currency"),
            "due_date": str(invoice.get("due_date")),
            "buyer_name": invoice.get("buyer_name"),
        },
        "bank": {"id": (bank or {}).get("id"), "name": (bank or {}).get("name"), "code": (bank or {}).get("code")},
        "eligible_pools": compact,
        "scoring_hint": {
            "settlement_date_fit": 0.35,
            "pool_capacity": 0.20,
            "current_fill": 0.15,
            "risk": 0.15,
            "currency": 0.10,
            "other": 0.05,
        },
    }

    system = (
        "You are the Pool Match Agent for a SINGLE bank. You MUST pick only from eligible_pools. "
        "Do not invent pool IDs. Do not consider any pool not in the list. "
        "You recommend; you do not assign. Return ONLY JSON: "
        "recommended_pool_id (string), match_score (0-100), reason (string), "
        "alternatives (array of {pool_id, match_score, reason})."
    )
    output = _invoke_bedrock(system, json.dumps(input_data))

    chosen = validate_ai_recommendation(output, eligible_ids)
    ranked = deterministic_rank(invoice, eligible_pools)

    if not chosen:
        logger.warning(
            "AI matching fallback invoice=%s reason=%s",
            invoice.get("id"),
            "invalid_or_unavailable",
        )
        top = ranked[0]
        alts = [
            {"pool_id": r["pool_id"], "match_score": r["match_score"], "reason": r["reason"]}
            for r in ranked[1:4]
        ]
        result = {
            "recommended_pool_id": top["pool_id"],
            "match_score": top["match_score"],
            "reason": top["reason"],
            "alternatives": alts,
            "source": "deterministic_fallback",
        }
    else:
        alt_ai = output.get("alternatives") or []
        safe_alts = [a for a in alt_ai if str(a.get("pool_id")) in eligible_ids and str(a.get("pool_id")) != chosen]
        result = {
            "recommended_pool_id": chosen,
            "match_score": output.get("match_score") or next(
                (r["match_score"] for r in ranked if r["pool_id"] == chosen), 80
            ),
            "reason": output.get("reason") or "Best eligible match for this bank.",
            "alternatives": safe_alts[:4],
            "source": "ai",
        }

    _log_agent_run(
        invoice.get("id"),
        result["recommended_pool_id"],
        "matching",
        {"eligible_pool_ids": list(eligible_ids), "bank_id": invoice.get("bank_id")},
        result,
        result["reason"],
        result.get("match_score"),
    )
    return result


def run_risk_agent(invoice: dict, pool: dict | None) -> dict:
    if not pool:
        return {"risk_score": 25.0, "reasoning": "No pool to score", "confidence": 50.0}
    input_data = {"invoice_id": invoice.get("id"), "pool_id": pool.get("id"), "total": pool.get("total_amount")}
    system = (
        "You are the Risk Agent. Score pool concentration/volatility 1-100. "
        "Return ONLY JSON: risk_score, reasoning, confidence."
    )
    output = _invoke_bedrock(system, json.dumps(input_data))
    if output.get("is_fallback"):
        output = {"risk_score": 25.0, "reasoning": "Fallback", "confidence": 50.0}
    _log_agent_run(
        invoice.get("id"), pool.get("id"), "risk", input_data, output,
        str(output.get("risk_score")), output.get("confidence"),
    )
    return output


def run_agent_pipeline(invoice: dict, bank: dict) -> dict:
    """
    Validate → deterministic eligibility (this bank only) → AI recommend → never assign.
    """
    logger.info(
        "Invoice received id=%s exporter=%s bank=%s amount=%s %s due=%s",
        invoice.get("id"), invoice.get("exporter_id"), bank.get("id"),
        invoice.get("amount"), invoice.get("currency"), invoice.get("due_date"),
    )

    extracted = invoice.get("extracted") or {}
    if invoice.get("document_text") and not extracted:
        doc = run_document_agent(invoice)
        extracted = doc.get("fields") or {k: doc.get(k) for k in ("amount", "currency", "due_date", "buyer_name") if doc.get(k)}

    with ThreadPoolExecutor(max_workers=2) as executor:
        f_invoice = executor.submit(run_invoice_agent, invoice)
        f_compliance = executor.submit(run_compliance_agent, invoice)
        invoice_assessment = f_invoice.result()
        compliance_assessment = f_compliance.result()

    compliance_status = compliance_assessment.get("compliance_status", "flagged")
    validation_status = "passed" if invoice_assessment.get("is_plausible") else "flagged"

    bank_pools = list_bank_pools(bank["id"])
    eligible = filter_eligible_pools(invoice, bank_pools, invoice["exporter_id"], bank["id"])
    logger.info(
        "Eligibility invoice=%s bank=%s bank_pools=%s eligible=%s",
        invoice.get("id"), bank.get("code") or bank.get("id"),
        len(bank_pools), len(eligible),
    )

    recommendation = run_matching_agent(invoice, eligible, bank)
    rec_pool = next((p for p in eligible if str(p["id"]) == str(recommendation.get("recommended_pool_id"))), None)
    risk_assessment = run_risk_agent(invoice, rec_pool)

    logger.info(
        "Recommendation invoice=%s pool=%s score=%s source=%s validation=recommend_only",
        invoice.get("id"),
        recommendation.get("recommended_pool_id"),
        recommendation.get("match_score"),
        recommendation.get("source"),
    )

    _log_agent_run(
        invoice.get("id"),
        recommendation.get("recommended_pool_id"),
        "orchestrator",
        {"invoice_id": invoice.get("id"), "bank_id": bank.get("id"), "eligible": len(eligible)},
        {"compliance": compliance_status, "recommendation": recommendation},
        "Pipeline Complete — recommendation only",
        100.0,
    )

    return {
        "compliance_status": compliance_status,
        "validation_status": validation_status,
        "risk_score": risk_assessment.get("risk_score"),
        "extracted": extracted,
        "eligible_pools": eligible,
        "recommendation": recommendation,
        "pool": rec_pool,
    }


# Back-compat alias used by older imports
def run_pooling_agent(invoice: dict) -> dict:
    from app.services.bank_identity import get_bank

    bank = get_bank(invoice["bank_id"])
    result = run_agent_pipeline(invoice, bank)
    return result.get("pool") or {}
