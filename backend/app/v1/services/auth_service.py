"""
auth_service.py — Authentication business logic
Author: Didier
Version: 1.0.0
"""

from datetime import datetime, timedelta

from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import DimUser


def create_jwt(spotify_user_id: str, user_id: int, settings: Settings) -> str:
    payload = {
        "sub": spotify_user_id,
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_jwt(token: str, settings: Settings) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def upsert_user(
    db: Session,
    profile: dict,
    access_token: str,
    refresh_token: str,
    expires_in: int,
) -> DimUser:
    now = datetime.utcnow()
    token_expires_at = now + timedelta(seconds=expires_in)

    user = db.query(DimUser).filter(DimUser.spotify_id == profile["id"]).first()

    if user:
        user.display_name = profile.get("display_name")
        user.email = profile.get("email")
        user.country = profile.get("country")
        user.followers = profile.get("followers", {}).get("total")
        user.product = profile.get("product")
        user.spotify_access_token = access_token
        user.spotify_refresh_token = refresh_token
        user.token_expires_at = token_expires_at
        user.loaded_at = now
    else:
        user = DimUser(
            spotify_id=profile["id"],
            display_name=profile.get("display_name"),
            email=profile.get("email"),
            country=profile.get("country"),
            followers=profile.get("followers", {}).get("total"),
            product=profile.get("product"),
            spotify_access_token=access_token,
            spotify_refresh_token=refresh_token,
            token_expires_at=token_expires_at,
            loaded_at=now,
        )
        db.add(user)
        db.flush()

    return user
