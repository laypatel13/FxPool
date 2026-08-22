import secrets
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.api.deps import require_bank, CurrentUser
from app.core.supabase import get_supabase
from app.models.bank import BankOverviewOut, InviteCreate, InviteOut
from app.models.pool import PoolCreate, PoolOut, PoolDetailOut, PoolUpdate
from app.models.invoice import InvoiceOut
from app.services.bank_identity import get_bank, require_same_bank
from app.services.pooling_service import create_bank_pool, mark_pool_unfilled
from app.services.rate_service import compute_indicative_forward_rate
from app.services.settlement_service import execute_pool, prepare_hedge, settle_pool

router = APIRouter(prefix="/bank", tags=["bank"])


def _bank(user: CurrentUser) -> dict:
    return get_bank(user.bank_id)


def _own_pool(pool_id: str, bank_id: str) -> dict:
    db = get_supabase()
    res = db.table("pools").select("*").eq("id", pool_id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(404, "Pool not found")
    require_same_bank(bank_id, res.data.get("bank_id"))
    return res.data


@router.get("/me")
def my_bank(user: CurrentUser = Depends(require_bank)):
    return _bank(user)


@router.get("/overview", response_model=BankOverviewOut)
def overview(user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    bank = _bank(user)
    bank_id = user.bank_id

    pools = db.table("pools").select("*").eq("bank_id", bank_id).execute().data or []
    invoices = db.table("invoices").select("status, amount").eq("bank_id", bank_id).execute().data or []
    exporters = (
        db.table("exporter_bank_relationships")
        .select("id", count="exact")
        .eq("bank_id", bank_id)
        .eq("status", "active")
        .execute()
    )

    active = [p for p in pools if p.get("status") in ("collecting", "target_reached", "hedging")]
    total_pooled = sum(float(p.get("total_amount") or 0) for p in active)
    hedged = sum(float(p.get("total_amount") or 0) for p in pools if p.get("status") in ("hedged", "settled"))
    pending = sum(1 for i in invoices if i.get("status") in ("pending_pool", "recommended"))
    open_exp = sum(
        float(i.get("amount") or 0)
        for i in invoices
        if i.get("status") in ("pending_pool", "recommended", "pooled", "pool_not_filled")
    )

    return {
        "bank": bank,
        "active_pools": len(active),
        "exporters": exporters.count or 0,
        "pending_invoices": pending,
        "total_pooled": total_pooled,
        "hedged_exposure": hedged,
        "open_exposure": open_exp,
    }


@router.get("/pools", response_model=list[PoolOut])
def list_pools(status: Optional[str] = Query(default=None), user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    q = db.table("pools").select("*").eq("bank_id", user.bank_id).order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    return q.execute().data or []


@router.post("/pools", response_model=PoolOut, status_code=201)
def create_pool(body: PoolCreate, user: CurrentUser = Depends(require_bank)):
    return create_bank_pool(user.bank_id, body)


@router.get("/pools/{pool_id}", response_model=PoolDetailOut)
def get_pool(pool_id: str, user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    pool = _own_pool(pool_id, user.bank_id)
    invoices = db.table("invoices").select("*").eq("pool_id", pool_id).eq("bank_id", user.bank_id).execute().data or []
    exporter_ids = {inv["exporter_id"] for inv in invoices if inv.get("exporter_id")}
    if exporter_ids:
        profiles = db.table("profiles").select("id, full_name").in_("id", list(exporter_ids)).execute().data or []
        names = {p["id"]: p["full_name"] for p in profiles}
        for inv in invoices:
            inv["exporter_name"] = names.get(inv["exporter_id"])
    return {**pool, "invoices": invoices}


@router.patch("/pools/{pool_id}", response_model=PoolOut)
def update_pool(pool_id: str, body: PoolUpdate, user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    pool = _own_pool(pool_id, user.bank_id)
    if pool["status"] in ("hedged", "settled", "cancelled", "expired"):
        raise HTTPException(400, f"Cannot edit a pool with status '{pool['status']}'")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields provided")
    res = db.table("pools").update(updates).eq("id", pool_id).eq("bank_id", user.bank_id).execute()
    return res.data[0]


@router.post("/pools/{pool_id}/hedge", response_model=PoolOut)
def start_hedge(pool_id: str, user: CurrentUser = Depends(require_bank)):
    pool = _own_pool(pool_id, user.bank_id)
    if pool["status"] not in ("collecting", "target_reached"):
        raise HTTPException(400, f"Cannot start hedge from status '{pool['status']}'")
    return prepare_hedge(pool_id)


@router.post("/pools/{pool_id}/execute", response_model=PoolOut)
def execute(pool_id: str, user: CurrentUser = Depends(require_bank)):
    pool = _own_pool(pool_id, user.bank_id)
    if pool["status"] not in ("collecting", "target_reached", "hedging"):
        raise HTTPException(400, f"Cannot execute a pool with status '{pool['status']}'")
    mid_date = date.fromisoformat(pool["bucket_end_date"])
    locked_rate = compute_indicative_forward_rate(pool["currency"], mid_date)
    return execute_pool(pool_id, locked_rate, next_status="hedged")


@router.post("/pools/{pool_id}/settle", response_model=PoolOut)
def settle(pool_id: str, user: CurrentUser = Depends(require_bank)):
    pool = _own_pool(pool_id, user.bank_id)
    if pool["status"] not in ("hedged", "locked"):
        raise HTTPException(400, "Pool must be hedged before it can be settled")
    return settle_pool(pool_id)


@router.post("/pools/{pool_id}/unfilled", response_model=PoolOut)
def expire_unfilled(pool_id: str, user: CurrentUser = Depends(require_bank)):
    """Explicit fallback: pool missed target → invoices become pool_not_filled."""
    return mark_pool_unfilled(pool_id, user.bank_id)


@router.get("/exporters")
def list_exporters(user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    rels = (
        db.table("exporter_bank_relationships")
        .select("*")
        .eq("bank_id", user.bank_id)
        .execute()
        .data
        or []
    )
    ids = [r["exporter_id"] for r in rels]
    profiles = []
    if ids:
        profiles = db.table("profiles").select("id, full_name, company_name").in_("id", ids).execute().data or []
    by_id = {p["id"]: p for p in profiles}
    invoices = db.table("invoices").select("exporter_id, amount").eq("bank_id", user.bank_id).execute().data or []
    counts: dict[str, dict] = {}
    for inv in invoices:
        s = counts.setdefault(inv["exporter_id"], {"invoice_count": 0, "total_volume": 0.0})
        s["invoice_count"] += 1
        s["total_volume"] += float(inv["amount"])
    out = []
    for r in rels:
        p = by_id.get(r["exporter_id"], {})
        stats = counts.get(r["exporter_id"], {"invoice_count": 0, "total_volume": 0.0})
        out.append(
            {
                "id": r["exporter_id"],
                "relationship_id": r["id"],
                "status": r["status"],
                "full_name": p.get("full_name"),
                "company_name": p.get("company_name"),
                **stats,
            }
        )
    return out


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(status: Optional[str] = Query(default=None), user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    q = db.table("invoices").select("*").eq("bank_id", user.bank_id).order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    rows = q.execute().data or []
    ids = {r["exporter_id"] for r in rows if r.get("exporter_id")}
    if ids:
        profiles = db.table("profiles").select("id, full_name").in_("id", list(ids)).execute().data or []
        names = {p["id"]: p["full_name"] for p in profiles}
        for r in rows:
            r["exporter_name"] = names.get(r["exporter_id"])
    return rows


@router.get("/invites", response_model=list[InviteOut])
def list_invites(user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    return (
        db.table("invitation_codes")
        .select("*")
        .eq("bank_id", user.bank_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )


@router.post("/invites", response_model=InviteOut, status_code=201)
def create_invite(body: InviteCreate, user: CurrentUser = Depends(require_bank)):
    db = get_supabase()
    kind = body.kind if body.kind in ("exporter", "bank_user") else "exporter"
    code = (body.code or f"FXP-{secrets.token_hex(3).upper()}").strip()
    res = db.table("invitation_codes").insert(
        {"bank_id": user.bank_id, "code": code, "kind": kind, "status": "active"}
    ).execute()
    return res.data[0]
