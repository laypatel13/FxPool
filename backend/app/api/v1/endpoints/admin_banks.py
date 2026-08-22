import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import require_admin
from app.core.supabase import get_supabase
from app.models.bank import BankCreate, BankOut, BankUpdate, InviteCreate, InviteOut

router = APIRouter(prefix="/admin/banks", tags=["admin-banks"])


@router.get("", response_model=list[BankOut])
def list_banks(user=Depends(require_admin)):
    db = get_supabase()
    return db.table("banks").select("*").order("created_at", desc=True).execute().data or []


@router.post("", response_model=BankOut, status_code=status.HTTP_201_CREATED)
def create_bank(body: BankCreate, user=Depends(require_admin)):
    db = get_supabase()
    row = {
        "code": body.code.strip().upper(),
        "name": body.name.strip(),
        "status": body.status or "pending",
    }
    try:
        res = db.table("banks").insert(row).execute()
    except Exception as e:
        raise HTTPException(400, f"Could not create bank: {e}")
    return res.data[0]


@router.get("/{bank_id}", response_model=BankOut)
def get_bank(bank_id: str, user=Depends(require_admin)):
    db = get_supabase()
    res = db.table("banks").select("*").eq("id", bank_id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(404, "Bank not found")
    return res.data


@router.patch("/{bank_id}", response_model=BankOut)
def update_bank(bank_id: str, body: BankUpdate, user=Depends(require_admin)):
    db = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields provided")
    res = db.table("banks").update(updates).eq("id", bank_id).execute()
    if not res.data:
        raise HTTPException(404, "Bank not found")
    return res.data[0]


@router.post("/{bank_id}/verify", response_model=BankOut)
def verify_bank(bank_id: str, user=Depends(require_admin)):
    db = get_supabase()
    res = db.table("banks").update({"status": "active"}).eq("id", bank_id).execute()
    if not res.data:
        raise HTTPException(404, "Bank not found")
    return res.data[0]


@router.post("/{bank_id}/suspend", response_model=BankOut)
def suspend_bank(bank_id: str, user=Depends(require_admin)):
    db = get_supabase()
    res = db.table("banks").update({"status": "suspended"}).eq("id", bank_id).execute()
    if not res.data:
        raise HTTPException(404, "Bank not found")
    return res.data[0]


@router.get("/{bank_id}/invites", response_model=list[InviteOut])
def list_invites(bank_id: str, user=Depends(require_admin)):
    db = get_supabase()
    return (
        db.table("invitation_codes")
        .select("*")
        .eq("bank_id", bank_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )


@router.post("/{bank_id}/invites", response_model=InviteOut, status_code=status.HTTP_201_CREATED)
def create_invite(bank_id: str, body: InviteCreate, user=Depends(require_admin)):
    db = get_supabase()
    bank = db.table("banks").select("id").eq("id", bank_id).maybe_single().execute()
    if not bank or not bank.data:
        raise HTTPException(404, "Bank not found")
    if body.kind not in ("exporter", "bank_user"):
        raise HTTPException(400, "kind must be exporter or bank_user")
    code = (body.code or f"FXP-{secrets.token_hex(3).upper()}").strip()
    res = db.table("invitation_codes").insert(
        {"bank_id": bank_id, "code": code, "kind": body.kind, "status": "active"}
    ).execute()
    return res.data[0]
