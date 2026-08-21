from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import require_exporter, CurrentUser
from app.core.supabase import get_supabase
from app.models.invoice import InvoiceCreate, InvoiceOut
from app.services.rate_service import compute_indicative_forward_rate
from app.services.pooling_service import assign_invoice_to_pool

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

    assign_invoice_to_pool(invoice)

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