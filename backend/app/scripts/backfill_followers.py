"""
backfill_followers.py
One-shot backfill: refresh user token, iterate over EVERY dim_artists row
with followers_count IS NULL, call GET /artists/{id} individually, and
write followers_count.

Runs as a Cloud Run Job. Not part of the regular ETL.
"""
import asyncio
import logging
import sys
from datetime import datetime, timedelta

import httpx

from app.core.config import get_settings
from app.core.database import DimArtist, DimUser, _get_session_local
from app.core.spotify_client import SpotifyClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("backfill_followers")

# Throttle to avoid Spotify rate limits (max ~10 req/s sustained)
_SLEEP_BETWEEN_CALLS = 0.15


async def refresh_token_for_user(user: DimUser, settings) -> str:
    client = SpotifyClient(access_token="")
    tokens = await client.refresh_token(settings.SPOTIFY_CLIENT_ID, user.spotify_refresh_token)
    user.spotify_access_token = tokens["access_token"]
    user.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
    if "refresh_token" in tokens:
        user.spotify_refresh_token = tokens["refresh_token"]
    return tokens["access_token"]


async def fetch_single_artist(access_token: str, spotify_id: str) -> dict | None:
    """GET /v1/artists/{id} — single artist (works where batch returned 403)."""
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://api.spotify.com/v1/artists/{spotify_id}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            r = await client.get(url, headers=headers)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as exc:
            logger.warning("GET /artists/%s -> %d", spotify_id, exc.response.status_code)
            return None
        except Exception as exc:
            logger.warning("GET /artists/%s failed: %s", spotify_id, exc)
            return None


async def main() -> int:
    settings = get_settings()
    SessionLocal = _get_session_local()
    db = SessionLocal()
    try:
        users = db.query(DimUser).all()
        if not users:
            logger.error("No users in dim_users")
            return 0
        user = users[0]
        logger.info("Using token of user %s (%s)", user.spotify_id, user.display_name)

        access_token = await refresh_token_for_user(user, settings)
        db.commit()
        logger.info("Token refreshed")

        targets = (
            db.query(DimArtist)
            .filter(DimArtist.followers_count.is_(None))
            .order_by(DimArtist.artist_id)
            .all()
        )
        logger.info("Found %d artist(s) with followers_count IS NULL", len(targets))

        updated = 0
        for idx, artist in enumerate(targets, start=1):
            data = await fetch_single_artist(access_token, artist.spotify_id)
            if data:
                total = (data.get("followers") or {}).get("total")
                if total is not None:
                    artist.followers_count = total
                    if data.get("genres"):
                        artist.genres = data["genres"]
                    updated += 1
                    if idx % 10 == 0 or idx == len(targets):
                        logger.info(
                            "[%d/%d] %s -> followers=%s",
                            idx, len(targets), artist.name, total,
                        )
            await asyncio.sleep(_SLEEP_BETWEEN_CALLS)

            # commit every 25 to avoid losing progress on long runs
            if idx % 25 == 0:
                db.commit()

        db.commit()
        logger.info("Backfill done: %d artist row(s) updated", updated)
        return updated
    finally:
        db.close()


if __name__ == "__main__":
    updated = asyncio.run(main())
    sys.exit(0)
