from collections import defaultdict
from fastapi import APIRouter, Depends
from app.api.deps import require_admin
from app.core.supabase import get_supabase
from app.models.admin import ExporterSummaryOut

router = APIRouter(prefix="/admin/exporters", tags=["admin-exporters"])


@router.get("", response_model=list[ExporterSummaryOut])
def list_exporters(user=Depends(require_admin)):
    db = get_supabase()
    exporters = db.table("profiles").select("*").eq("role", "exporter").execute().data or []
    invoices = db.table("invoices").select("exporter_id, amount").execute().data or []

    stats: dict[str, dict] = defaultdict(lambda: {"invoice_count": 0, "total_volume": 0.0})
    for inv in invoices:
        s = stats[inv["exporter_id"]]
        s["invoice_count"] += 1
        s["total_volume"] += float(inv["amount"])

    return [
        {
            "id": e["id"],
            "full_name": e["full_name"],
            "company_name": e.get("company_name"),
            "invoice_count": stats[e["id"]]["invoice_count"],
            "total_volume": stats[e["id"]]["total_volume"],
        }
        for e in exporters
    ]
