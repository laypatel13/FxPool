from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_verified_user, CurrentUser, VerifiedUser
from app.core.supabase import get_supabase
from app.core.db import fetch_one
from app.models.profile import ProfileCreate, ProfileOut, ProfileUpdate
from app.services.bank_identity import consume_invitation

from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

class ValidateInviteRequest(BaseModel):
    code: str
    role: str

@router.post("/validate-invite")
def validate_invite(body: ValidateInviteRequest):
    if body.role == "admin":
        return {"ok": True}
    
    if not body.code:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Invitation code is required to join a bank",
        )
        
    kind = "bank_user" if body.role == "bank" else "exporter"
    # This throws 400 Bad Request if invalid
    consume_invitation(body.code, kind)
    return {"ok": True}


@router.post("/profile", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def create_profile(body: ProfileCreate, user: VerifiedUser = Depends(get_verified_user)):
    db = get_supabase()
    existing = db.table("profiles").select("id").eq("id", user.id).execute()
    if existing.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "Profile already exists")

    bank_id = None
    if body.role == "admin":
        pass
    elif body.role in ("bank", "exporter"):
        if not body.invitation_code:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Invitation code is required to join a bank",
            )
        kind = "bank_user" if body.role == "bank" else "exporter"
        invite = consume_invitation(body.invitation_code, kind)
        bank_id = invite["bank_id"]
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown role")

    row = {
        "id": user.id,
        "role": body.role,
        "full_name": body.full_name,
        "company_name": body.company_name,
        "bank_id": bank_id,
    }
    res = db.table("profiles").insert(row).execute()

    if body.role == "exporter" and bank_id:
        try:
            db.table("exporter_bank_relationships").insert(
                {
                    "exporter_id": user.id,
                    "bank_id": bank_id,
                    "status": "active",
                }
            ).execute()
        except Exception:
            pass

    return res.data[0]


@router.get("/me", response_model=ProfileOut)
def get_me(user: VerifiedUser = Depends(get_verified_user)):
    """Uses the JWT only — does not require a profile row yet, so the client
    can tell a missing profile from a forbidden role."""
    db = get_supabase()
    res = fetch_one(db.table("profiles").select("*").eq("id", user.id))
    if not res:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return res


@router.patch("/me", response_model=ProfileOut)
def update_me(body: ProfileUpdate, user: CurrentUser = Depends(get_current_user)):
    db = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update")
    res = db.table("profiles").update(updates).eq("id", user.id).execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return res.data[0]
