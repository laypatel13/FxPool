from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import require_exporter, CurrentUser
from app.core.supabase import get_supabase
from app.models.invoice import InvoiceCreate, InvoiceOut
from app.services.rate_service import compute_indicative_forward_rate
from app.services.agents import run_agent_pipeline

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(body: InvoiceCreate, user: CurrentUser = Depends(require_exporter)):
    db = get_supabase()
    try:
        indicative_rate = compute_indicative_forward_rate(body.currency, body.due_date)
    except ValueError as e:
        raise HTTPException(400, str(e))

    row = {
        "exporter_id": user.id,
        "amount": body.amount,
        "currency": body.currency.upper(),
        "due_date": body.due_date.isoformat(),
        "indicative_rate": indicative_rate,
        "status": "pending_pool",
    }
    inserted = db.table("invoices").insert(row).execute()
    invoice = inserted.data[0]

    # 1. Run the AI pipeline (parallel validation -> pooling -> risk)
    pipeline_result = run_agent_pipeline(invoice)
    
    # 2. Update the invoice row with AI-generated fields
    db.table("invoices").update({
        "risk_score": pipeline_result["risk_score"],
        "compliance_status": pipeline_result["compliance_status"],
        "agent_recommended_pool_id": pipeline_result["pool"]["id"] if pipeline_result["pool"] else None
    }).eq("id", invoice["id"]).execute()
    
    # 3. Update the pool with the new risk_score
    if pipeline_result["pool"]:
        db.table("pools").update({
            "risk_score": pipeline_result["risk_score"]
        }).eq("id", pipeline_result["pool"]["id"]).execute()

    final = db.table("invoices").select("*").eq("id", invoice["id"]).single().execute()
    return final.data


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


@router.post("/{invoice_id}/confirm", response_model=InvoiceOut)
def confirm_invoice(invoice_id: str, user: CurrentUser = Depends(require_exporter)):
    """Exporter confirms the indicative rate and locks the invoice."""
    db = get_supabase()
    
    # Verify ownership
    res = db.table("invoices").select("*").eq("id", invoice_id).eq("exporter_id", user.id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(404, "Invoice not found")
        
    # Update to confirmed
    updated = (
        db.table("invoices")
        .update({"exporter_confirmed": True})
        .eq("id", invoice_id)
        .execute()
    )
    
    return updated.data[0]