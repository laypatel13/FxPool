from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.api.deps import require_bank
from app.core.supabase import get_supabase
from app.models.pool import PoolOut, PoolDetailOut

router = APIRouter(prefix="/bank/pools", tags=["bank-pools"])

@router.get("", response_model=List[PoolOut])
def list_bank_pools(user=Depends(require_bank)):
    # RLS enforces the user only sees pools for their bank
    db = get_supabase()
    res = db.table("pools").select("*").order("created_at", desc=True).execute()
    return res.data

@router.get("/{pool_id}", response_model=PoolDetailOut)
def get_bank_pool(pool_id: str, user=Depends(require_bank)):
    db = get_supabase()
    pool_res = db.table("pools").select("*").eq("id", pool_id).execute()
    if not pool_res.data:
        raise HTTPException(404, "Pool not found")
    pool = pool_res.data[0]
    
    invoices = db.table("invoices").select("*").eq("pool_id", pool_id).execute().data or []
    return {**pool, "invoices": invoices}

@router.post("/{pool_id}/quote")
def quote_pool(pool_id: str, rate: float, user=Depends(require_bank)):
    db = get_supabase()
    # Get bank_id for the user
    user_res = db.table("bank_users").select("bank_id").eq("id", user.id).single().execute()
    bank_id = user_res.data["bank_id"]
    
    res = db.table("bank_quotes").insert({
        "pool_id": pool_id,
        "bank_id": bank_id,
        "quoted_rate": rate,
        "source": "manual"
    }).execute()
    return res.data[0]

@router.post("/{pool_id}/confirm-settlement")
def confirm_settlement(pool_id: str, user=Depends(require_bank)):
    db = get_supabase()
    pool_res = db.table("pools").select("*").eq("id", pool_id).execute()
    if not pool_res.data:
        raise HTTPException(404, "Pool not found")
    pool = pool_res.data[0]
    
    if pool["status"] != "locked":
        raise HTTPException(400, "Pool not ready for settlement")
        
    from app.services.settlement_service import settle_pool
    return settle_pool(pool_id)
