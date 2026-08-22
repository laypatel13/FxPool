from typing import Any, Optional

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

MISSING_SCHEMA = (
    "Supabase tables are missing or not exposed. In the Supabase SQL editor, run "
    "backend/sql/schema.sql, then 001_add_agent_runs.sql, 002_add_exporter_confirmed.sql, "
    "003_bank_owned_v2.sql, 004_finish_bank_owned.sql, 005_compliance_documents.sql, "
    "and seed_demo.sql. Then Project Settings → API → Reload schema."
)


def translate_api_error(exc: APIError) -> None:
    """Turn PostgREST failures into HTTP errors the browser can actually read."""
    message = exc.message or ""
    details = exc.details or ""
    code = str(exc.code) if exc.code is not None else ""
    blob = f"{code} {message} {details}".lower()

    if code == "204" or "missing response" in blob:
        return
    if (
        code == "PGRST205"
        or code == "42703"
        or "could not find the table" in blob
        or "schema cache" in blob
        or "does not exist" in blob
    ):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, MISSING_SCHEMA)
    
    if code == "23503" and "profiles_id_fkey" in blob:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Your user account no longer exists. Please sign out and sign up again."
        )
    raise HTTPException(
        status.HTTP_502_BAD_GATEWAY,
        f"Database error ({code or 'unknown'}): {message or details or 'request failed'}",
    )


def fetch_one(query) -> Optional[dict[str, Any]]:
    """First matching row, or None. Avoids supabase-py maybe_single() 204 crashes."""
    try:
        res = query.limit(1).execute()
    except APIError as exc:
        translate_api_error(exc)
        return None
    if not res or not res.data:
        return None
    row = res.data[0] if isinstance(res.data, list) else res.data
    return row if isinstance(row, dict) else None
