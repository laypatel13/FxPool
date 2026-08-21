from functools import lru_cache
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from app.core.config import settings


@lru_cache
def get_supabase() -> Client:
    """Service-role client — bypasses RLS. Only used server-side after
    the caller's role has already been verified via the JWT dependency.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
        options=ClientOptions(postgrest_client_timeout=10),  # fail fast instead of hanging indefinitely
    )