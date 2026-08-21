from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.api.deps import require_admin
from app.core.supabase import get_supabase
from app.models.bank import BankOut, BankCreate, BankCapacityOut, BankCapacityBase

router = APIRouter(prefix="/admin/banks", tags=["admin-banks"])

@router.get("", response_model=List[BankOut])
def list_banks(user=Depends(require_admin)):
    db = get_supabase()
    res = db.table("banks").select("*").order("created_at", desc=True).execute()
    return res.data

@router.post("", response_model=BankOut)
def create_bank(bank: BankCreate, user=Depends(require_admin)):
    db = get_supabase()
    res = db.table("banks").insert(bank.model_dump()).execute()
    return res.data[0]

@router.get("/{bank_id}", response_model=BankOut)
def get_bank(bank_id: str, user=Depends(require_admin)):
    db = get_supabase()
    res = db.table("banks").select("*").eq("id", bank_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Bank not found")
    return res.data

@router.put("/{bank_id}/capacity", response_model=BankCapacityOut)
def set_bank_capacity(bank_id: str, cap: BankCapacityBase, user=Depends(require_admin)):
    db = get_supabase()
    
    res = db.table("bank_capacity").upsert({
        "bank_id": bank_id,
        "currency": cap.currency,
        "max_exposure": cap.max_exposure,
        "min_pool_amount": cap.min_pool_amount
    }, on_conflict="bank_id, currency").execute()
    
    return res.data[0]
