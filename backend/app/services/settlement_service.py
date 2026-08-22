from datetime import datetime, timezone
from app.core.supabase import get_supabase


def execute_pool(pool_id: str, locked_rate: float, next_status: str = "hedged") -> dict:
    """Bank hedge: freeze the rate for every assigned invoice in the pool."""
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    pool_res = db.table("pools").update(
        {"status": next_status, "locked_rate": locked_rate, "executed_at": now, "updated_at": now}
    ).eq("id", pool_id).execute()

    db.table("invoices").update(
        {"status": "locked", "locked_rate": locked_rate}
    ).eq("pool_id", pool_id).eq("status", "pooled").execute()

    return pool_res.data[0]


def prepare_hedge(pool_id: str) -> dict:
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    pool_res = db.table("pools").update(
        {"status": "hedging", "updated_at": now}
    ).eq("id", pool_id).execute()
    return pool_res.data[0]


def settle_pool(pool_id: str) -> dict:
    db = get_supabase()
    pool = db.table("pools").select("*").eq("id", pool_id).single().execute().data
    invoices = db.table("invoices").select("*").eq("pool_id", pool_id).execute().data

    locked_rate = float(pool["locked_rate"])
    now = datetime.now(timezone.utc).isoformat()

    for inv in invoices:
        payout = round(float(inv["amount"]) * locked_rate, 2)
        db.table("invoices").update(
            {"status": "settled", "payout_amount": payout}
        ).eq("id", inv["id"]).execute()

    updated_pool = db.table("pools").update(
        {"status": "settled", "settled_at": now, "updated_at": now}
    ).eq("id", pool_id).execute()

    return updated_pool.data[0]
