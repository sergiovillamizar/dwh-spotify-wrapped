from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SPOTIFY_CLIENT_ID: str
    SPOTIFY_CLIENT_SECRET: str
    SPOTIFY_REDIRECT_URI: str = "http://127.0.0.1:8000/v1/auth/callback"
    DATABASE_URL: str
    APP_NAME: str = "Spotify DWH API"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:3000"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
