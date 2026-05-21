"""
dependencies.py — FastAPI shared dependencies
Author: Didier
Version: 1.0.0
"""

from jose import JWTError
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import DimUser, get_db
from app.v1.services.auth_service import decode_jwt


def get_current_user(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DimUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )

    if not authorization:
        raise credentials_exception

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise credentials_exception

    token = parts[1]

    try:
        payload = decode_jwt(token, settings)
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(DimUser).filter(DimUser.user_id == user_id).first()
    if user is None:
        raise credentials_exception

    return user
