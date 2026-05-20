"""
auth.py — OAuth2 PKCE authentication endpoints
Author: Didier
Version: 1.0.0
"""

import logging
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import PKCESession, get_db
from app.core.spotify_client import (
    SpotifyClient,
    build_auth_url,
    generate_code_challenge,
    generate_code_verifier,
)
from app.v1.schemas.auth import LoginResponse
from app.v1.services.auth_service import create_jwt, upsert_user

_log = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


@router.get("/login", response_model=LoginResponse)
def login(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    try:
        verifier = generate_code_verifier()
        code_challenge = generate_code_challenge(verifier)
        state = secrets.token_urlsafe(16)

        pkce_session = PKCESession(
            state=state,
            verifier=verifier,
            created_at=datetime.utcnow(),
        )
        db.add(pkce_session)
        db.commit()

        auth_url = build_auth_url(
            settings.SPOTIFY_CLIENT_ID,
            settings.SPOTIFY_REDIRECT_URI,
            state,
            code_challenge,
        )
        return LoginResponse(auth_url=auth_url)
    except Exception as e:
        _log.error("login failed: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not initiate Spotify login: {str(e)}",
        )


@router.get("/callback")
async def callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RedirectResponse:
    pkce_session = db.query(PKCESession).filter(PKCESession.state == state).first()
    if pkce_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid state")

    verifier = pkce_session.verifier
    db.delete(pkce_session)
    db.flush()

    client = SpotifyClient(access_token="")
    tokens = await client.exchange_code(
        settings.SPOTIFY_CLIENT_ID,
        code,
        settings.SPOTIFY_REDIRECT_URI,
        verifier,
    )

    profile_client = SpotifyClient(access_token=tokens["access_token"])
    profile = await profile_client.get_user_profile()

    user = upsert_user(
        db,
        profile,
        tokens["access_token"],
        tokens["refresh_token"],
        tokens["expires_in"],
    )
    db.commit()

    token = create_jwt(user.spotify_id, user.user_id, settings)
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/callback?token={token}",
        status_code=302,
    )
