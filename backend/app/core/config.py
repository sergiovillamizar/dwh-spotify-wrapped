from __future__ import annotations

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SPOTIFY_CLIENT_ID: str
    SPOTIFY_CLIENT_SECRET: str
    SPOTIFY_REDIRECT_URI: str = "http://127.0.0.1:8000/v1/auth/callback"

    # DATABASE_URL can be provided directly (local dev via Cloud SQL proxy)
    # or constructed from DB_PASSWORD + CLOUD_SQL_INSTANCE (Cloud Run production).
    DATABASE_URL: str = ""
    DB_PASSWORD: str = ""
    CLOUD_SQL_INSTANCE: str = ""

    SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:3000"
    APP_NAME: str = "Spotify DWH API"
    APP_VERSION: str = "1.0.0"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8

    # Cloud Scheduler OIDC verification
    # Email of sa-etl-scheduler; verified on every POST /v1/etl/run-batch request.
    SCHEDULER_SA_EMAIL: str = "sa-etl-scheduler@dwh-spotify-wrapped.iam.gserviceaccount.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def build_database_url(self) -> Settings:
        if not self.DATABASE_URL:
            if not self.DB_PASSWORD or not self.CLOUD_SQL_INSTANCE:
                raise ValueError(
                    "Set DATABASE_URL (local) or both DB_PASSWORD + CLOUD_SQL_INSTANCE (Cloud Run)"
                )
            self.DATABASE_URL = (
                f"postgresql+psycopg2://postgres:{self.DB_PASSWORD}"
                f"@/postgres?host=/cloudsql/{self.CLOUD_SQL_INSTANCE}"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
