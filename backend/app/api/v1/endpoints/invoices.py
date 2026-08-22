import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.deps import require_exporter, CurrentUser
from app.core.supabase import get_supabase
from app.models.invoice import InvoiceCreate, InvoiceOut, ParticipateBody
from app.models.pool import RecommendationOut
from app.services.rate_service import compute_indicative_forward_rate
from app.services.agents import run_agent_pipeline
from app.services.bank_identity import get_bank, resolve_exporter_bank_id
from app.services.eligibility import filter_eligible_pools
from app.services.pooling_service import list_bank_pools, participate as join_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _extract_pdf_text(raw: bytes) -> str:
    try:
        from pypdf import PdfReader
        import io

        reader = PdfReader(io.BytesIO(raw))
        parts = []
        for page in reader.pages[:12]:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()
    except Exception as e:
        logger.warning("PDF text extraction failed: %s", e)
        return ""


def _merge_extracted(fields: dict, extracted: dict) -> dict:
    out = dict(fields)
    for key in ("amount", "currency", "due_date", "invoice_number", "issue_date", "buyer_name", "buyer_country", "payment_terms"):
        if extracted.get(key) not in (None, "") and not out.get(key):
            out[key] = extracted[key]
    if out.get("currency"):
        out["currency"] = str(out["currency"]).upper()
    if out.get("amount") is not None:
        out["amount"] = float(out["amount"])
    return out


def _ingest(user: CurrentUser, fields: dict, document_text: Optional[str], document_url: Optional[str]) -> dict:
    """Trusted bank identity from the exporter relationship — never from the client."""
    bank_id = resolve_exporter_bank_id(user.id)
    bank = get_bank(bank_id)
    logger.info("Exporter identified id=%s bank=%s (%s)", user.id, bank.get("code"), bank_id)

    extracted = {}
    if document_text:
        from app.services.agents import run_document_agent

        doc = run_document_agent({"document_text": document_text, "id": None})
        extracted = doc.get("fields") or {
            k: doc.get(k)
            for k in ("amount", "currency", "due_date", "invoice_number", "issue_date", "buyer_name", "buyer_country", "payment_terms")
            if doc.get(k) is not None
        }
        fields = _merge_extracted(fields, extracted)

    amount = fields.get("amount")
    currency = (fields.get("currency") or "").upper()
    due_date = fields.get("due_date")
    if due_date and not isinstance(due_date, str):
        due_date = due_date.isoformat() if hasattr(due_date, "isoformat") else str(due_date)

    if not amount or not currency or not due_date:
        raise HTTPException(
            400,
            "Invoice needs amount, currency, and due date (enter them or upload a readable PDF)",
        )

    try:
        due = date.fromisoformat(str(due_date)[:10])
        indicative_rate = compute_indicative_forward_rate(currency, due)
    except ValueError as e:
        raise HTTPException(400, str(e))

    db = get_supabase()
    row = {
        "exporter_id": user.id,
        "bank_id": bank_id,
        "amount": amount,
        "currency": currency,
        "due_date": due.isoformat(),
        "invoice_number": fields.get("invoice_number"),
        "issue_date": str(fields["issue_date"])[:10] if fields.get("issue_date") else None,
        "buyer_name": fields.get("buyer_name"),
        "buyer_country": fields.get("buyer_country"),
        "payment_terms": fields.get("payment_terms"),
        "document_url": document_url,
        "extracted_data": extracted or None,
        "indicative_rate": indicative_rate,
        "status": "pending_pool",
        "pool_match_status": "none",
    }
    invoice = db.table("invoices").insert(row).execute().data[0]
    logger.info("Invoice received id=%s exporter=%s bank=%s", invoice["id"], user.id, bank.get("code"))

    pipeline = run_agent_pipeline({**invoice, "extracted": extracted}, bank)
    rec = pipeline.get("recommendation") or {}
    rec_pool = pipeline.get("pool")
    new_status = "recommended" if rec.get("recommended_pool_id") else "pending_pool"

    db.table("invoices").update(
        {
            "risk_score": pipeline.get("risk_score"),
            "compliance_status": pipeline.get("compliance_status"),
            "validation_status": pipeline.get("validation_status"),
            "extracted_data": pipeline.get("extracted") or extracted or None,
            "agent_recommended_pool_id": rec.get("recommended_pool_id"),
            "match_score": rec.get("match_score"),
            "match_reason": rec.get("reason"),
            "recommended_alternatives": rec.get("alternatives"),
            "pool_match_status": "recommended" if rec.get("recommended_pool_id") else "none",
            "status": new_status,
        }
    ).eq("id", invoice["id"]).execute()

    if rec_pool:
        db.table("pools").update({"risk_score": pipeline.get("risk_score")}).eq("id", rec_pool["id"]).execute()

    logger.info(
        "Invoice %s | Exporter %s | Bank %s | Eligible pools: %s | AI recommendation: %s | Match score: %s",
        invoice["id"],
        user.id,
        bank.get("code"),
        len(pipeline.get("eligible_pools") or []),
        rec.get("recommended_pool_id"),
        rec.get("match_score"),
    )

    return db.table("invoices").select("*").eq("id", invoice["id"]).single().execute().data


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(body: InvoiceCreate, user: CurrentUser = Depends(require_exporter)):
    fields = body.model_dump()
    return _ingest(user, fields, body.document_text, body.document_url)


@router.post("/upload", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def upload_invoice(
    user: CurrentUser = Depends(require_exporter),
    file: UploadFile = File(...),
    amount: Optional[float] = Form(None),
    currency: Optional[str] = Form(None),
    due_date: Optional[str] = Form(None),
    invoice_number: Optional[str] = Form(None),
    buyer_name: Optional[str] = Form(None),
    buyer_country: Optional[str] = Form(None),
    payment_terms: Optional[str] = Form(None),
):
    raw = await file.read()
    text = _extract_pdf_text(raw) if (file.filename or "").lower().endswith(".pdf") else raw.decode("utf-8", errors="ignore")
    fields = {
        "amount": amount,
        "currency": currency,
        "due_date": due_date,
        "invoice_number": invoice_number,
        "buyer_name": buyer_name,
        "buyer_country": buyer_country,
        "payment_terms": payment_terms,
    }
    return _ingest(user, fields, text or None, None)


@router.get("", response_model=list[InvoiceOut])
def list_my_invoices(user: CurrentUser = Depends(require_exporter)):
    db = get_supabase()
    res = (
        db.table("invoices")
        .select("*")
        .eq("exporter_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: str, user: CurrentUser = Depends(require_exporter)):
    db = get_supabase()
    res = (
        db.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("exporter_id", user.id)
        .maybe_single()
        .execute()
    )
    if not res or not res.data:
        raise HTTPException(404, "Invoice not found")
    return res.data


def _owned_invoice(invoice_id: str, user: CurrentUser) -> dict:
    db = get_supabase()
    res = (
        db.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("exporter_id", user.id)
        .maybe_single()
        .execute()
    )
    if not res or not res.data:
        raise HTTPException(404, "Invoice not found")
    return res.data


@router.get("/{invoice_id}/eligibility")
def get_eligibility(invoice_id: str, user: CurrentUser = Depends(require_exporter)):
    invoice = _owned_invoice(invoice_id, user)
    bank_id = resolve_exporter_bank_id(user.id)
    bank = get_bank(bank_id)
    invoice = {**invoice, "bank_id": bank_id}
    eligible = filter_eligible_pools(invoice, list_bank_pools(bank_id), user.id, bank_id)
    return {
        "bank": {"id": bank["id"], "code": bank.get("code"), "name": bank.get("name")},
        "eligible_pools": eligible,
        "count": len(eligible),
    }


@router.get("/{invoice_id}/recommendation", response_model=RecommendationOut)
def get_recommendation(invoice_id: str, user: CurrentUser = Depends(require_exporter)):
    invoice = _owned_invoice(invoice_id, user)
    bank_id = resolve_exporter_bank_id(user.id)
    bank = get_bank(bank_id)
    invoice = {**invoice, "bank_id": bank_id}
    eligible = filter_eligible_pools(invoice, list_bank_pools(bank_id), user.id, bank_id)
    from app.services.agents import run_matching_agent

    recommendation = run_matching_agent(invoice, eligible, bank)
    return {
        "invoice": invoice,
        "eligible_pools": eligible,
        "recommendation": recommendation,
        "bank": {"id": bank["id"], "code": bank.get("code"), "name": bank.get("name")},
    }


@router.post("/{invoice_id}/participate")
def participate(invoice_id: str, body: ParticipateBody, user: CurrentUser = Depends(require_exporter)):
    invoice = _owned_invoice(invoice_id, user)
    pool_id = body.pool_id or invoice.get("agent_recommended_pool_id")
    if not pool_id:
        raise HTTPException(400, "No pool specified and no recommendation to accept")
    result = join_pool(invoice, pool_id, user.id)
    logger.info(
        "Final validation PASS invoice=%s pool=%s assignment=SUCCESS",
        invoice_id,
        pool_id,
    )
    return result


@router.post("/{invoice_id}/confirm", response_model=InvoiceOut)
def confirm_invoice(invoice_id: str, user: CurrentUser = Depends(require_exporter)):
    """Accept the recommended pool (deterministic revalidation + atomic join)."""
    invoice = _owned_invoice(invoice_id, user)
    pool_id = invoice.get("agent_recommended_pool_id")
    if not pool_id:
        raise HTTPException(400, "No recommended pool to accept")
    result = join_pool(invoice, pool_id, user.id)
    return result["invoice"]
