import jwt
from jwt import PyJWKClient, PyJWTError
from app.core.config import settings


class InvalidTokenError(Exception):
    pass


_jwks_client = None
if settings.supabase_url:
    try:
        _jwks_client = PyJWKClient(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
            timeout=10,
        )
    except Exception:
        _jwks_client = None


def decode_supabase_jwt(token: str) -> dict:
    """Verify a Supabase access token.

    Newer projects sign with ES256/RS256 (JWKS). Older projects still use
    HS256 with the dashboard JWT secret. Try asymmetric first, then HS256.
    """
    last_error: Exception | None = None

    if _jwks_client is not None:
        try:
            signing_key = _jwks_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
        except Exception as e:
            last_error = e

    secret = settings.supabase_jwt_secret
    if secret:
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except PyJWTError as e:
            last_error = e

    raise InvalidTokenError(str(last_error) if last_error else "Unable to verify token")
