from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    # Only used if a project is on Supabase's legacy HS256 shared-secret
    # system. Newer projects (ES256/asymmetric) verify via JWKS instead —
    # see app/core/security.py — and don't need this set at all.
    supabase_jwt_secret: Optional[str] = None
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()