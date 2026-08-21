from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.api.deps import require_admin
from app.core.supabase import get_supabase
from app.models.pool import PoolOut, PoolDetailOut
from app.services.rate_service import compute_indicative_forward_rate
from app.services.settlement_service import execute_pool, settle_pool
from datetime import date

router = APIRouter(prefix="/admin/pools", tags=["admin-pools"])


@router.get("", response_model=list[PoolOut])
def list_pools(status: Optional[str] = Query(default=None), user=Depends(require_admin)):
    db = get_supabase()
    q = db.table("pools").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    return q.execute().data


@router.get("/{pool_id}", response_model=PoolDetailOut)
def get_pool(pool_id: str, user=Depends(require_admin)):
    db = get_supabase()
    pool = db.table("pools").select("*").eq("id", pool_id).single().execute().data
    if not pool:
        raise HTTPException(404, "Pool not found")
    invoices = db.table("invoices").select("*").eq("pool_id", pool_id).execute().data or []

    exporter_ids = {inv["exporter_id"] for inv in invoices if inv.get("exporter_id")}
    if exporter_ids:
        profiles = db.table("profiles").select("id, full_name").in_("id", list(exporter_ids)).execute().data or []
        names = {p["id"]: p["full_name"] for p in profiles}
        for inv in invoices:
            inv["exporter_name"] = names.get(inv["exporter_id"])

    return {**pool, "invoices": invoices}


@router.post("/{pool_id}/execute", response_model=PoolOut)
def execute(pool_id: str, user=Depends(require_admin)):
    db = get_supabase()
    pool = db.table("pools").select("*").eq("id", pool_id).single().execute().data
    if not pool:
        raise HTTPException(404, "Pool not found")
    if pool["status"] not in ("collecting", "suggested"):
        raise HTTPException(400, f"Cannot execute a pool with status '{pool['status']}'")

    # Lock rate using the pool's mid-bucket date as the representative settlement date
    mid_date = date.fromisoformat(pool["bucket_end_date"])
    locked_rate = compute_indicative_forward_rate(pool["currency"], mid_date)
    return execute_pool(pool_id, locked_rate)


@router.post("/{pool_id}/settle", response_model=PoolOut)
def settle(pool_id: str, user=Depends(require_admin)):
    db = get_supabase()
    pool = db.table("pools").select("*").eq("id", pool_id).single().execute().data
    if not pool:
        raise HTTPException(404, "Pool not found")
    if pool["status"] != "locked":
        raise HTTPException(400, "Pool must be 'locked' before it can be settled")
    return settle_pool(pool_id)
