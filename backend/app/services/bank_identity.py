"""Trusted bank identity — never taken from the client body."""

from __future__ import annotations

from fastapi import HTTPException, status
from app.core.supabase import get_supabase
from app.core.db import fetch_one


def resolve_exporter_bank_id(exporter_id: str) -> str:
    db = get_supabase()
    rel = (
        db.table("exporter_bank_relationships")
        .select("bank_id")
        .eq("exporter_id", exporter_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    if rel.data:
        return rel.data[0]["bank_id"]

    profile = fetch_one(db.table("profiles").select("bank_id").eq("id", exporter_id))
    bank_id = (profile or {}).get("bank_id")
    if bank_id:
        return bank_id

    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "Exporter is not associated with a bank — use a valid invitation code",
    )


def get_bank(bank_id: str) -> dict:
    db = get_supabase()
    res = fetch_one(db.table("banks").select("*").eq("id", bank_id))
    if not res:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bank not found")
    return res


def require_same_bank(user_bank_id: str | None, resource_bank_id: str | None) -> None:
    if not user_bank_id or not resource_bank_id or str(user_bank_id) != str(resource_bank_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-bank access denied")


def consume_invitation(code: str, kind: str) -> dict:
    """Look up an active invite. Does not trust client-supplied bank_id."""
    db = get_supabase()
    raw = (code or "").strip()
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invitation code is required")

    res = fetch_one(
        db.table("invitation_codes")
        .select("*")
        .ilike("code", raw)
        .eq("status", "active")
    )
    if not res:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Unknown invitation code.",
        )
    if res["kind"] != kind:
        if res["kind"] == "bank_user":
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "This code is for a bank portal account. Select Bank at the top, then try again.",
            )
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This code is for an exporter account. Select Exporter at the top, then try again.",
        )
    return res
