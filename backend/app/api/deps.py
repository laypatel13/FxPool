from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_supabase_jwt, InvalidTokenError
from app.core.supabase import get_supabase
from app.core.db import fetch_one

bearer_scheme = HTTPBearer()


class VerifiedUser:
    def __init__(self, id: str, email: str | None):
        self.id = id
        self.email = email


class CurrentUser:
    def __init__(self, id: str, email: str | None, role: str, bank_id: str | None = None):
        self.id = id
        self.email = email
        self.role = role
        self.bank_id = bank_id


def get_verified_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> VerifiedUser:
    try:
        payload = decode_supabase_jwt(creds.credentials)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return VerifiedUser(id=payload.get("sub"), email=payload.get("email"))


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    try:
        payload = decode_supabase_jwt(creds.credentials)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user_id = payload.get("sub")
    email = payload.get("email")

    db = get_supabase()
    row = fetch_one(db.table("profiles").select("role, bank_id").eq("id", user_id))
    if not row:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Profile not found — call /auth/profile first")

    return CurrentUser(
        id=user_id,
        email=email,
        role=row["role"],
        bank_id=row.get("bank_id"),
    )


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


def require_bank(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "bank":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bank access required")
    if not user.bank_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bank user is not linked to a bank")
    return user


def require_exporter(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "exporter":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Exporter access required")
    return user


def require_admin_or_bank(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in ("admin", "bank"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bank or admin access required")
    return user
