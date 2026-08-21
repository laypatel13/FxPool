from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import require_admin, CurrentUser
from app.core.supabase import get_supabase
from app.models.settings import PoolSettingsOut, PoolSettingsUpdate

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


@router.get("", response_model=PoolSettingsOut)
def get_settings(user=Depends(require_admin)):
    db = get_supabase()
    res = db.table("pool_settings").select("*").is_("currency", "null").limit(1).execute()
    if not res.data:
        raise HTTPException(404, "No global settings row found — seed pool_settings first")
    return res.data[0]


@router.put("", response_model=PoolSettingsOut)
def update_settings(body: PoolSettingsUpdate, user: CurrentUser = Depends(require_admin)):
    db = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields provided to update")
    updates["updated_by"] = user.id

    existing = db.table("pool_settings").select("id").is_("currency", "null").limit(1).execute()
    if not existing.data:
        raise HTTPException(404, "No global settings row found — seed pool_settings first")

    res = db.table("pool_settings").update(updates).eq("id", existing.data[0]["id"]).execute()
    return res.data[0]
