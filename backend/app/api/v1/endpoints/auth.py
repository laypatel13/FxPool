from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, get_verified_user, CurrentUser, VerifiedUser
from app.core.supabase import get_supabase
from app.models.profile import ProfileCreate, ProfileOut, ProfileUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/profile", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def create_profile(body: ProfileCreate, user: VerifiedUser = Depends(get_verified_user)):
    db = get_supabase()
    existing = db.table("profiles").select("id").eq("id", user.id).execute()
    if existing.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "Profile already exists")

    row = {"id": user.id, **body.model_dump()}
    res = db.table("profiles").insert(row).execute()
    return res.data[0]


@router.get("/me", response_model=ProfileOut)
def get_me(user: CurrentUser = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("profiles").select("*").eq("id", user.id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return res.data


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