from datetime import date, datetime, timezone
from app.core.supabase import get_supabase


def get_pool_settings(currency: str) -> dict:
    """Per-currency setting if present, else the global (currency=null) default."""
    db = get_supabase()
    res = (
        db.table("pool_settings")
        .select("*")
        .eq("currency", currency)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]

    res = db.table("pool_settings").select("*").is_("currency", "null").limit(1).execute()
    if res.data:
        return res.data[0]

    # Hard fallback if no settings row exists yet
    return {"bucket_width_days": 7, "min_pool_amount": 5000}


def assign_invoice_to_pool(invoice: dict) -> dict:
    """Core pooling algorithm — runs right after an invoice is inserted.
    1. Find an open ('collecting') pool of the same currency whose bucket
       window contains this invoice's due_date.
    2. If none exists, open a new pool sized by the current N.
    3. Attach the invoice, roll up total_amount, and flip the pool to
       'suggested' once the threshold is crossed (admin still confirms).
    """
    db = get_supabase()
    currency = invoice["currency"]
    due_date = invoice["due_date"]
    settings = get_pool_settings(currency)
    n = settings["bucket_width_days"]
    min_amount = settings.get("min_pool_amount") or 0

    pool_res = (
        db.table("pools")
        .select("*")
        .eq("currency", currency)
        .eq("status", "collecting")
        .lte("bucket_start_date", due_date)
        .gte("bucket_end_date", due_date)
        .limit(1)
        .execute()
    )

    if pool_res.data:
        pool = pool_res.data[0]
    else:
        due = date.fromisoformat(due_date) if isinstance(due_date, str) else due_date
        bucket_start = (due - _days(n)).isoformat()
        bucket_end = (due + _days(n)).isoformat()
        created = (
            db.table("pools")
            .insert(
                {
                    "currency": currency,
                    "bucket_start_date": bucket_start,
                    "bucket_end_date": bucket_end,
                    "bucket_width_days": n,
                    "status": "collecting",
                    "total_amount": 0,
                }
            )
            .execute()
        )
        pool = created.data[0]

    new_total = float(pool["total_amount"]) + float(invoice["amount"])
    new_status = "suggested" if new_total >= min_amount else pool["status"]

    updated = (
        db.table("pools")
        .update({"total_amount": new_total, "status": new_status})
        .eq("id", pool["id"])
        .execute()
    )
    pool = updated.data[0]

    db.table("invoices").update(
        {"pool_id": pool["id"], "status": "pooled"}
    ).eq("id", invoice["id"]).execute()

    return pool


def _days(n: int):
    from datetime import timedelta
    return timedelta(days=n)


def assign_to_existing_pool(invoice: dict, pool_id: str) -> dict:
    """Agent-driven pool assignment bypasses bucket logic for an exact ID match."""
    db = get_supabase()
    
    # 1. Fetch pool to check min_amount thresholds
    pool_res = db.table("pools").select("*").eq("id", pool_id).execute()
    if not pool_res.data:
        return None
    pool = pool_res.data[0]

    settings = get_pool_settings(invoice["currency"])
    min_amount = settings.get("min_pool_amount") or 0

    new_total = float(pool["total_amount"]) + float(invoice["amount"])
    new_status = "suggested" if new_total >= min_amount and pool["status"] == "collecting" else pool["status"]

    updated = (
        db.table("pools")
        .update({"total_amount": new_total, "status": new_status})
        .eq("id", pool["id"])
        .execute()
    )
    pool = updated.data[0]

    db.table("invoices").update(
        {"pool_id": pool["id"], "status": "pooled"}
    ).eq("id", invoice["id"]).execute()

    return pool
