from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_supabase_jwt, InvalidTokenError
from app.core.supabase import get_supabase

bearer_scheme = HTTPBearer()


class VerifiedUser:
    """JWT-verified but not yet looked up against `profiles` — the only
    identity available to someone who just signed up and has no profile
    row yet."""

    def __init__(self, id: str, email: str | None):
        self.id = id
        self.email = email


class CurrentUser:
    def __init__(self, id: str, email: str | None, role: str):
        self.id = id
        self.email = email
        self.role = role


def get_verified_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> VerifiedUser:
    """Verifies the Supabase JWT only — no profile row required. Use this
    (not get_current_user) for the one endpoint that creates the profile
    row in the first place: POST /auth/profile."""
    try:
        payload = decode_supabase_jwt(creds.credentials)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return VerifiedUser(id=payload.get("sub"), email=payload.get("email"))


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    """Verify the Supabase JWT, then look up the user's role from `profiles`.
    Raises 401 if the token is invalid, 403 if no profile row exists yet
    (i.e. signup succeeded but POST /auth/profile hasn't been called).
    """
    try:
        payload = decode_supabase_jwt(creds.credentials)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user_id = payload.get("sub")
    email = payload.get("email")

    db = get_supabase()
    res = db.table("profiles").select("role").eq("id", user_id).maybe_single().execute()
    if not res or not res.data:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Profile not found — call /auth/profile first")

    return CurrentUser(id=user_id, email=email, role=res.data["role"])


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


def require_exporter(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "exporter":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Exporter access required")
    return user