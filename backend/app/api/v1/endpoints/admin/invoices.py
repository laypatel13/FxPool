from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.api.deps import require_admin
from app.core.supabase import get_supabase
from app.models.invoice import InvoiceOut

router = APIRouter(prefix="/admin/invoices", tags=["admin-invoices"])


def _attach_exporter_names(db, rows: list[dict]) -> list[dict]:
    """Joins in each invoice's exporter full_name so the console never has
    to show a bare UUID."""
    ids = {r["exporter_id"] for r in rows if r.get("exporter_id")}
    if not ids:
        return rows
    profiles = db.table("profiles").select("id, full_name").in_("id", list(ids)).execute().data or []
    names = {p["id"]: p["full_name"] for p in profiles}
    for r in rows:
        r["exporter_name"] = names.get(r["exporter_id"])
    return rows


@router.get("", response_model=list[InvoiceOut])
def list_all_invoices(status: Optional[str] = Query(default=None), user=Depends(require_admin)):
    db = get_supabase()
    q = db.table("invoices").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    rows = q.execute().data or []
    return _attach_exporter_names(db, rows)
