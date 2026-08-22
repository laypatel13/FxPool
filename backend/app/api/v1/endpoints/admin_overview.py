from fastapi import APIRouter, Depends
from app.api.deps import require_admin
from app.core.supabase import get_supabase
from app.models.admin import AdminOverviewOut

router = APIRouter(prefix="/admin/overview", tags=["admin-overview"])


@router.get("", response_model=AdminOverviewOut)
def get_overview(user=Depends(require_admin)):
    db = get_supabase()

    exporters = db.table("profiles").select("id", count="exact").eq("role", "exporter").execute()
    banks = db.table("banks").select("id", count="exact").neq("code", "FXPOOL-LEGACY").execute()
    active_pools = (
        db.table("pools")
        .select("id", count="exact")
        .in_("status", ["collecting", "target_reached", "hedging"])
        .execute()
    )
    pending = (
        db.table("pools")
        .select("id", count="exact")
        .in_("status", ["target_reached", "hedging"])
        .execute()
    )
    executed = (
        db.table("pools")
        .select("id", count="exact")
        .in_("status", ["hedged", "settled", "locked"])
        .execute()
    )

    volume_rows = (
        db.table("pools")
        .select("total_amount")
        .in_("status", ["hedged", "settled", "locked"])
        .execute()
    )
    total_volume = sum(float(row["total_amount"]) for row in (volume_rows.data or []))

    return {
        "total_exporters": exporters.count or 0,
        "active_pools": active_pools.count or 0,
        "pending_approvals": pending.count or 0,
        "contracts_executed": executed.count or 0,
        "total_volume_hedged": total_volume,
        "total_banks": banks.count or 0,
    }
