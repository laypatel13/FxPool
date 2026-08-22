"""Deterministic eligibility — AI never decides bank isolation or hard rules."""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

OPEN_POOL_STATUSES = frozenset({"collecting", "target_reached"})
JOIN_BLOCKED_STATUSES = frozenset({"draft", "hedging", "hedged", "settled", "cancelled", "expired"})


def _as_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, type(date.min)):
        # datetime is subclass of date
        return value if type(value) is date else value.date()  # type: ignore[union-attr]
    if hasattr(value, "date") and callable(value.date) and not isinstance(value, date):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value[:10])
    return None


def _num(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    return float(value)


def evaluate_pool(invoice: dict, pool: dict, exporter_id: str, exporter_bank_id: str) -> dict:
    """Return {eligible: bool, reasons: list[str]} for a single pool."""
    reasons: list[str] = []

    if str(pool.get("bank_id")) != str(exporter_bank_id):
        reasons.append("bank_mismatch")
    if str(invoice.get("bank_id") or exporter_bank_id) != str(pool.get("bank_id")):
        reasons.append("invoice_bank_mismatch")
    if (invoice.get("currency") or "").upper() != (pool.get("currency") or "").upper():
        reasons.append("currency_mismatch")

    status = pool.get("status") or ""
    if status not in OPEN_POOL_STATUSES:
        reasons.append("pool_not_open")

    due = _as_date(invoice.get("due_date"))
    start = _as_date(pool.get("bucket_start_date"))
    end = _as_date(pool.get("bucket_end_date"))
    if due and start and end and not (start <= due <= end):
        reasons.append("settlement_window")

    amount = _num(invoice.get("amount"))
    total = _num(pool.get("total_amount"))
    maximum = pool.get("maximum_amount")
    if maximum is not None and total + amount > _num(maximum):
        reasons.append("capacity")

    allowed = pool.get("eligible_exporter_ids")
    if allowed:
        ids = [str(x) for x in allowed]
        if str(exporter_id) not in ids:
            reasons.append("exporter_not_eligible")

    compliance = (invoice.get("compliance_status") or "approved").lower()
    if compliance == "rejected":
        reasons.append("compliance_rejected")

    # unique reasons
    uniq = list(dict.fromkeys(reasons))
    return {"eligible": len(uniq) == 0, "reasons": uniq, "pool_id": pool.get("id")}


def filter_eligible_pools(
    invoice: dict,
    pools: list[dict],
    exporter_id: str,
    exporter_bank_id: str,
) -> list[dict]:
    """Return pools that pass every deterministic rule. Cross-bank pools never appear."""
    same_bank = [p for p in pools if str(p.get("bank_id")) == str(exporter_bank_id)]
    eligible = []
    for pool in same_bank:
        result = evaluate_pool(invoice, pool, exporter_id, exporter_bank_id)
        if result["eligible"]:
            eligible.append(pool)
    return eligible


def remaining_capacity(pool: dict) -> Optional[float]:
    maximum = pool.get("maximum_amount")
    if maximum is None:
        return None
    return max(0.0, _num(maximum) - _num(pool.get("total_amount")))


def fill_pct(pool: dict) -> float:
    target = pool.get("target_amount") or pool.get("maximum_amount") or pool.get("minimum_amount")
    if not target:
        return 0.0
    return min(100.0, (_num(pool.get("total_amount")) / _num(target)) * 100)


def settlement_fit_score(invoice: dict, pool: dict) -> float:
    due = _as_date(invoice.get("due_date"))
    start = _as_date(pool.get("bucket_start_date"))
    end = _as_date(pool.get("bucket_end_date"))
    if not due or not start or not end or end < start:
        return 0.0
    if due < start or due > end:
        return 0.0
    span = (end - start).days or 1
    mid = start.toordinal() + span / 2
    dist = abs(due.toordinal() - mid) / (span / 2)
    return max(0.0, 100.0 * (1 - dist))


def capacity_score(invoice: dict, pool: dict) -> float:
    rem = remaining_capacity(pool)
    amount = _num(invoice.get("amount"))
    if rem is None:
        return 80.0
    if rem < amount:
        return 0.0
    # Prefer pools with room but not empty-or-overflowing
    ratio = amount / rem if rem else 0
    return max(0.0, 100.0 * (1 - min(ratio, 1.0) * 0.4))


def fill_level_score(pool: dict) -> float:
    pct = fill_pct(pool)
    # Prefer pools that are filling toward target (40–90%)
    if pct < 10:
        return 40.0
    if pct > 95:
        return 30.0
    return min(100.0, 40 + pct * 0.6)


def deterministic_rank(invoice: dict, eligible_pools: list[dict]) -> list[dict]:
    """Fallback ranking when AI is unavailable. Scores 0–100."""
    ranked = []
    for pool in eligible_pools:
        s_date = settlement_fit_score(invoice, pool)
        s_cap = capacity_score(invoice, pool)
        s_fill = fill_level_score(pool)
        s_risk = max(0.0, 100.0 - _num(pool.get("risk_score"), 25))
        s_ccy = 100.0 if (invoice.get("currency") or "").upper() == (pool.get("currency") or "").upper() else 0.0
        score = (
            0.35 * s_date
            + 0.20 * s_cap
            + 0.15 * s_fill
            + 0.15 * s_risk
            + 0.10 * s_ccy
            + 0.05 * 100.0
        )
        ranked.append(
            {
                "pool": pool,
                "pool_id": pool.get("id"),
                "match_score": round(score, 1),
                "reason": _reason(s_date, s_cap, s_fill),
            }
        )
    ranked.sort(key=lambda r: r["match_score"], reverse=True)
    return ranked


def _reason(s_date: float, s_cap: float, s_fill: float) -> str:
    if s_date >= s_cap and s_date >= s_fill:
        return "Best settlement-date alignment and sufficient remaining capacity."
    if s_cap > s_fill:
        return "Most remaining capacity among eligible settlement windows."
    return "Closest to target fill among eligible pools."


def sanitize_pools_for_ai(pools: list[dict]) -> list[dict]:
    """Strip unrelated-bank data is already done by filter; send a compact shape."""
    out = []
    for p in pools:
        out.append(
            {
                "id": p.get("id"),
                "name": p.get("name"),
                "bank_id": p.get("bank_id"),
                "currency": p.get("currency"),
                "status": p.get("status"),
                "bucket_start_date": str(p.get("bucket_start_date")),
                "bucket_end_date": str(p.get("bucket_end_date")),
                "total_amount": _num(p.get("total_amount")),
                "minimum_amount": p.get("minimum_amount"),
                "target_amount": p.get("target_amount"),
                "maximum_amount": p.get("maximum_amount"),
                "risk_score": p.get("risk_score"),
                "remaining_capacity": remaining_capacity(p),
                "fill_pct": round(fill_pct(p), 1),
            }
        )
    return out


def validate_ai_recommendation(output: dict, eligible_ids: set[str]) -> Optional[str]:
    """Return recommended pool_id if it is in the eligible set, else None."""
    if not output or output.get("is_fallback"):
        return None
    pid = output.get("recommended_pool_id") or output.get("pool_id")
    if not pid or str(pid) not in eligible_ids:
        return None
    return str(pid)


def assignment_guard(invoice: dict, pool: dict, exporter_id: str, exporter_bank_id: str) -> tuple[bool, str]:
    """Final deterministic gate before join. Never trust AI or the client."""
    result = evaluate_pool(invoice, pool, exporter_id, exporter_bank_id)
    if result["eligible"]:
        return True, "ok"
    return False, result["reasons"][0] if result["reasons"] else "rejected"
