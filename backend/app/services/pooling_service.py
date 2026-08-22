from __future__ import annotations

import logging
from datetime import datetime, timezone
from fastapi import HTTPException, status
from app.core.supabase import get_supabase
from app.services.eligibility import assignment_guard, OPEN_POOL_STATUSES
from app.services.bank_identity import resolve_exporter_bank_id

logger = logging.getLogger(__name__)


def get_template_settings() -> dict:
    """Platform default template only — never a mandatory matching rule."""
    db = get_supabase()
    res = db.table("pool_settings").select("*").is_("currency", "null").limit(1).execute()
    if res.data:
        return res.data[0]
    return {"bucket_width_days": 15, "min_pool_amount": 50000}


def create_bank_pool(bank_id: str, body) -> dict:
    """Banks own pools. bank_id always comes from the authenticated user."""
    from app.models.pool import PoolCreate

    data: PoolCreate = body
    if data.minimum_amount > data.target_amount or data.target_amount > data.maximum_amount:
        raise HTTPException(400, "Require minimum_amount ≤ target_amount ≤ maximum_amount")
    if data.bucket_end_date < data.bucket_start_date:
        raise HTTPException(400, "Settlement window end must be on or after start")

    template = get_template_settings()
    width = data.bucket_width_days or int(template.get("bucket_width_days") or 15)
    row = {
        "bank_id": bank_id,
        "name": data.name.strip(),
        "currency": data.currency.upper(),
        "bucket_start_date": data.bucket_start_date.isoformat(),
        "bucket_end_date": data.bucket_end_date.isoformat(),
        "bucket_width_days": width,
        "minimum_amount": data.minimum_amount,
        "target_amount": data.target_amount,
        "maximum_amount": data.maximum_amount,
        "eligible_exporter_ids": data.eligible_exporter_ids,
        "status": data.status or "collecting",
        "total_amount": 0,
    }
    db = get_supabase()
    inserted = db.table("pools").insert(row).execute()
    logger.info("Pool created bank=%s pool=%s name=%s", bank_id, inserted.data[0]["id"], data.name)
    return inserted.data[0]


def list_bank_pools(bank_id: str, statuses: list[str] | None = None) -> list[dict]:
    db = get_supabase()
    q = db.table("pools").select("*").eq("bank_id", bank_id)
    if statuses:
        q = q.in_("status", statuses)
    return q.order("created_at", desc=True).execute().data or []


def participate(invoice: dict, pool_id: str, exporter_id: str) -> dict:
    """Revalidate then atomically join. Client-supplied bank_id is ignored."""
    db = get_supabase()
    exporter_bank_id = resolve_exporter_bank_id(exporter_id)

    invoice_bank = invoice.get("bank_id") or exporter_bank_id
    if str(invoice_bank) != str(exporter_bank_id):
        logger.warning(
            "Join rejected: invoice bank %s != exporter bank %s invoice=%s",
            invoice_bank,
            exporter_bank_id,
            invoice.get("id"),
        )
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-bank pool participation rejected")

    pool_res = db.table("pools").select("*").eq("id", pool_id).maybe_single().execute()
    if not pool_res or not pool_res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pool not found")
    pool = pool_res.data

    ok, reason = assignment_guard(
        {**invoice, "bank_id": exporter_bank_id},
        pool,
        exporter_id,
        exporter_bank_id,
    )
    if not ok:
        logger.warning(
            "Final validation FAIL invoice=%s pool=%s reason=%s",
            invoice.get("id"),
            pool_id,
            reason,
        )
        code = status.HTTP_403_FORBIDDEN if reason in (
            "bank_mismatch",
            "invoice_bank_mismatch",
            "exporter_not_eligible",
        ) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, f"Pool assignment rejected: {reason}")

    try:
        rpc = db.rpc("try_join_pool", {"p_pool_id": pool_id, "p_invoice_id": invoice["id"]}).execute()
        payload = rpc.data
        if isinstance(payload, str):
            import json
            payload = json.loads(payload)
        if not payload or not payload.get("ok"):
            err = (payload or {}).get("error", "join_failed")
            logger.warning("try_join_pool failed invoice=%s pool=%s error=%s", invoice.get("id"), pool_id, err)
            http = status.HTTP_403_FORBIDDEN if err in ("bank_mismatch",) else status.HTTP_409_CONFLICT
            raise HTTPException(http, f"Pool assignment rejected: {err}")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("RPC try_join_pool unavailable, using guarded update: %s", e)
        _join_without_rpc(invoice, pool, exporter_bank_id)

    updated_inv = db.table("invoices").select("*").eq("id", invoice["id"]).single().execute().data
    updated_pool = db.table("pools").select("*").eq("id", pool_id).single().execute().data
    logger.info(
        "Assignment SUCCESS invoice=%s exporter=%s bank=%s pool=%s total=%s",
        invoice.get("id"),
        exporter_id,
        exporter_bank_id,
        pool_id,
        updated_pool.get("total_amount"),
    )
    return {"invoice": updated_inv, "pool": updated_pool}


def _join_without_rpc(invoice: dict, pool: dict, exporter_bank_id: str) -> None:
    db = get_supabase()
    new_total = float(pool["total_amount"]) + float(invoice["amount"])
    maximum = pool.get("maximum_amount")
    if maximum is not None and new_total > float(maximum):
        raise HTTPException(status.HTTP_409_CONFLICT, "Pool assignment rejected: capacity")
    if pool.get("status") not in OPEN_POOL_STATUSES:
        raise HTTPException(400, "Pool assignment rejected: pool_not_open")
    if str(pool.get("bank_id")) != str(exporter_bank_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Pool assignment rejected: bank_mismatch")

    new_status = "collecting"
    target = pool.get("target_amount")
    if target is not None and new_total >= float(target):
        new_status = "target_reached"
    if maximum is not None and new_total >= float(maximum):
        new_status = "target_reached"

    res = db.table("pools").update(
        {"total_amount": new_total, "status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", pool["id"]).eq("total_amount", float(pool["total_amount"])).in_("status", list(OPEN_POOL_STATUSES)).execute()

    if not res.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "Pool assignment rejected: concurrent update")

    db.table("invoices").update(
        {
            "pool_id": pool["id"],
            "status": "pooled",
            "pool_match_status": "assigned",
            "exporter_confirmed": True,
            "bank_id": exporter_bank_id,
        }
    ).eq("id", invoice["id"]).execute()


def apply_threshold_status(pool: dict) -> str:
    total = float(pool.get("total_amount") or 0)
    target = pool.get("target_amount")
    maximum = pool.get("maximum_amount")
    if maximum is not None and total >= float(maximum):
        return "target_reached"
    if target is not None and total >= float(target):
        return "target_reached"
    return "collecting"


def mark_pool_unfilled(pool_id: str, bank_id: str) -> dict:
    """Explicit fallback: pool missed target → invoices become pool_not_filled."""
    db = get_supabase()
    pool = db.table("pools").select("*").eq("id", pool_id).eq("bank_id", bank_id).maybe_single().execute()
    if not pool or not pool.data:
        raise HTTPException(404, "Pool not found")
    if pool.data["status"] not in ("collecting", "target_reached", "draft"):
        raise HTTPException(400, f"Cannot expire a pool with status '{pool.data['status']}'")

    db.table("pools").update({"status": "expired", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", pool_id).execute()
    db.table("invoices").update(
        {"status": "pool_not_filled", "pool_match_status": "pool_not_filled"}
    ).eq("pool_id", pool_id).in_("status", ["pooled", "recommended", "pending_pool"]).execute()

    logger.info("Pool %s marked unfilled (expired); member invoices set pool_not_filled", pool_id)
    return db.table("pools").select("*").eq("id", pool_id).single().execute().data
