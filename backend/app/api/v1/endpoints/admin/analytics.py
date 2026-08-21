from collections import defaultdict
from datetime import datetime
from fastapi import APIRouter, Depends
from app.api.deps import require_admin
from app.core.supabase import get_supabase
from app.models.admin import AdminAnalyticsOut

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("", response_model=AdminAnalyticsOut)
def get_analytics(user=Depends(require_admin)):
    """Aggregates real pool data — no fixtures. Monthly volume is bucketed by
    the month a pool was executed (falls back to created_at for pools that
    haven't been executed yet); currency mix is each currency's share of
    total hedged volume across executed/settled pools.
    """
    db = get_supabase()
    pools = db.table("pools").select("*").in_("status", ["locked", "settled"]).execute().data or []

    monthly = defaultdict(float)
    currency_totals = defaultdict(float)

    for pool in pools:
        amount = float(pool["total_amount"])
        timestamp = pool.get("executed_at") or pool.get("created_at")
        if timestamp:
            dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            monthly[dt.strftime("%b %Y")] += amount
        currency_totals[pool["currency"]] += amount

    total = sum(currency_totals.values()) or 1
    currency_mix = [
        {"currency": currency, "value": round(amount / total * 100, 1)}
        for currency, amount in sorted(currency_totals.items(), key=lambda kv: -kv[1])
    ]

    def sort_key(item: str):
        return datetime.strptime(item, "%b %Y")

    monthly_volume = [
        {"month": month, "total": round(amount, 2)}
        for month, amount in sorted(monthly.items(), key=lambda kv: sort_key(kv[0]))
    ]

    return {"monthly_volume": monthly_volume, "currency_mix": currency_mix}
