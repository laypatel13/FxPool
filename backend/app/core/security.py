import jwt
from jwt import PyJWKClient, PyJWTError
from app.core.config import settings


class InvalidTokenError(Exception):
    pass


# Supabase projects on the newer asymmetric JWT signing-key system (ES256)
# publish their public keys here — we verify against that instead of a
# shared secret. PyJWKClient fetches + caches the key set automatically.
_jwks_client = PyJWKClient(
    f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
    timeout=10,  # fail fast instead of hanging indefinitely on a bad network path
)


def decode_supabase_jwt(token: str) -> dict:
    """Verify and decode a Supabase-issued access token (ES256, via JWKS)."""
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
        return payload
    except PyJWTError as e:
        raise InvalidTokenError(str(e)) from e