from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.api.deps import get_current_user, CurrentUser, require_exporter
from app.core.supabase import get_supabase
from app.models.pool import PoolOut, PoolDetailOut
from app.models.settings import PoolSettingsOut
from app.services.bank_identity import resolve_exporter_bank_id, require_same_bank
from app.services.eligibility import OPEN_POOL_STATUSES, filter_eligible_pools
from app.services.pooling_service import participate as join_pool

router = APIRouter(prefix="/pools", tags=["pools"])


@router.get("", response_model=list[PoolOut])
def list_open_pools(status: Optional[str] = Query(default=None), user: CurrentUser = Depends(get_current_user)):
    """Exporters see only their bank's pools. Banks see their own. Admin sees all."""
    db = get_supabase()
    q = db.table("pools").select("*").order("created_at", desc=True)

    if user.role == "admin":
        if status:
            q = q.eq("status", status)
        return q.execute().data or []
    elif user.role == "bank":
        if not user.bank_id:
            raise HTTPException(403, "Bank user is not linked to a bank")
        q = q.eq("bank_id", user.bank_id)
        if status:
            q = q.eq("status", status)
        return q.execute().data or []
    else:
        bank_id = resolve_exporter_bank_id(user.id)
        q = q.eq("bank_id", bank_id)
        if not status:
            q = q.in_("status", list(OPEN_POOL_STATUSES))
        elif status:
            q = q.eq("status", status)

        all_bank_pools = q.execute().data or []
        
        invoices = (
            db.table("invoices")
            .select("*")
            .eq("exporter_id", user.id)
            .in_("status", ["pending_pool", "recommended", "pool_not_filled"])
            .execute()
            .data or []
        )
        
        if not invoices:
            return []
            
        eligible_pool_ids = set()
        for inv in invoices:
            eligible = filter_eligible_pools(inv, all_bank_pools, user.id, bank_id)
            for p in eligible:
                eligible_pool_ids.add(p["id"])
                
        return [p for p in all_bank_pools if p["id"] in eligible_pool_ids]


@router.get("/settings", response_model=PoolSettingsOut)
def get_pool_settings(user: CurrentUser = Depends(get_current_user)):
    """Platform default template only — operational thresholds live on each pool."""
    db = get_supabase()
    res = db.table("pool_settings").select("*").is_("currency", "null").limit(1).execute()
    if not res.data:
        raise HTTPException(404, "No default template row found — seed pool_settings first")
    return res.data[0]


@router.get("/{pool_id}", response_model=PoolDetailOut)
def get_pool_membership(pool_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("pools").select("*").eq("id", pool_id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(404, "Pool not found")
    pool = res.data

    if user.role == "exporter":
        bank_id = resolve_exporter_bank_id(user.id)
        require_same_bank(bank_id, pool.get("bank_id"))
    elif user.role == "bank":
        require_same_bank(user.bank_id, pool.get("bank_id"))

    q = db.table("invoices").select("*").eq("pool_id", pool_id)
    if user.role == "exporter":
        q = q.eq("exporter_id", user.id)
    elif user.role == "bank":
        q = q.eq("bank_id", user.bank_id)
    invoices = q.execute().data

    return {**pool, "invoices": invoices}


@router.post("/{pool_id}/join")
def join(pool_id: str, invoice_id: str, user: CurrentUser = Depends(require_exporter)):
    """Join a pool. Cross-bank participation is rejected with 403."""
    db = get_supabase()
    inv = (
        db.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("exporter_id", user.id)
        .maybe_single()
        .execute()
    )
    if not inv or not inv.data:
        raise HTTPException(404, "Invoice not found")
    return join_pool(inv.data, pool_id, user.id)
