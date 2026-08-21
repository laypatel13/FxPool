from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.api.deps import get_current_user, CurrentUser
from app.core.supabase import get_supabase
from app.models.pool import PoolOut, PoolDetailOut
from app.models.settings import PoolSettingsOut

router = APIRouter(prefix="/pools", tags=["pools"])


@router.get("", response_model=list[PoolOut])
def list_open_pools(status: Optional[str] = Query(default=None), user: CurrentUser = Depends(get_current_user)):
    """Any authenticated user can browse the pool marketplace — only
    aggregate pool totals are exposed here, never other exporters' invoices."""
    db = get_supabase()
    q = db.table("pools").select("*").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    return q.execute().data


@router.get("/settings", response_model=PoolSettingsOut)
def get_pool_settings(user: CurrentUser = Depends(get_current_user)):
    """Read-only global settings (bucket width, minimum pool amount) so the
    exporter UI can render fill-progress bars. Updating settings stays
    admin-only via PUT /admin/settings."""
    db = get_supabase()
    res = db.table("pool_settings").select("*").is_("currency", "null").limit(1).execute()
    if not res.data:
        raise HTTPException(404, "No global settings row found — seed pool_settings first")
    return res.data[0]


@router.get("/{pool_id}", response_model=PoolDetailOut)
def get_pool_membership(pool_id: str, user: CurrentUser = Depends(get_current_user)):
    """Exporter-safe pool detail: exporters only ever see their own
    invoices within the pool, never another exporter's invoice amounts.
    Admins (who also hit this via the app) see every member."""
    db = get_supabase()
    res = db.table("pools").select("*").eq("id", pool_id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(404, "Pool not found")
    pool = res.data

    q = db.table("invoices").select("*").eq("pool_id", pool_id)
    if user.role != "admin":
        q = q.eq("exporter_id", user.id)
    invoices = q.execute().data

    return {**pool, "invoices": invoices}