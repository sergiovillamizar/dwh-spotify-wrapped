"""
spotify_client.py
Module: app.core.spotify_client
Author: Didier Parody
Version: 0.1.0
Description: Async Spotify Web API client with PKCE OAuth helpers.
"""

import base64
import hashlib
import secrets
from urllib.parse import urlencode

import httpx

SCOPES = "user-read-private user-read-email user-top-read user-read-recently-played"


def generate_code_verifier() -> str:
    return secrets.token_urlsafe(48)


def generate_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def build_auth_url(
    client_id: str,
    redirect_uri: str,
    state: str,
    code_challenge: str,
) -> str:
    params: dict[str, str] = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": SCOPES,
        "state": state,
        "code_challenge_method": "S256",
        "code_challenge": code_challenge,
    }
    return f"https://accounts.spotify.com/authorize?{urlencode(params)}"


class SpotifyClient:
    BASE_URL = "https://api.spotify.com/v1"
    AUTH_URL = "https://accounts.spotify.com"

    def __init__(self, access_token: str) -> None:
        self._access_token = access_token

    @property
    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._access_token}"}

    async def exchange_code(
        self,
        client_id: str,
        code: str,
        redirect_uri: str,
        code_verifier: str,
    ) -> dict:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "code_verifier": code_verifier,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.AUTH_URL}/api/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            return response.json()

    async def refresh_token(self, client_id: str, refresh_token: str) -> dict:
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.AUTH_URL}/api/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me",
                headers=self._auth_headers,
            )
            response.raise_for_status()
            return response.json()

    async def get_top_artists(
        self,
        time_range: str = "medium_term",
        limit: int = 50,
    ) -> dict:
        params: dict[str, str | int] = {
            "time_range": time_range,
            "limit": limit,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/top/artists",
                headers=self._auth_headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()

    async def get_top_tracks(
        self,
        time_range: str = "medium_term",
        limit: int = 50,
    ) -> dict:
        params: dict[str, str | int] = {
            "time_range": time_range,
            "limit": limit,
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/top/tracks",
                headers=self._auth_headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()

    async def get_recently_played(
        self,
        limit: int = 50,
        before: int | None = None,
    ) -> dict:
        params: dict[str, str | int] = {"limit": limit}
        if before is not None:
            params["before"] = before
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/player/recently-played",
                headers=self._auth_headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()
