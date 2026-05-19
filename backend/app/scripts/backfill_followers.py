"""
backfill_followers.py
One-shot backfill: refresh user Spotify tokens, fetch top artists,
and update dim_artists.followers_count for matching records.

Runs as a Cloud Run Job. Not part of the regular ETL.
"""
import asyncio
import logging
import sys
from datetime import datetime, timedelta

from app.core.config import get_settings
from app.core.database import DimArtist, DimUser, _get_session_local
from app.core.spotify_client import SpotifyClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("backfill_followers")


async def refresh_token_for_user(user: DimUser, settings) -> str:
    """Force-refresh the user's Spotify access_token via refresh_token grant."""
    client = SpotifyClient(access_token="")
    tokens = await client.refresh_token(settings.SPOTIFY_CLIENT_ID, user.spotify_refresh_token)
    user.spotify_access_token = tokens["access_token"]
    user.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
    if "refresh_token" in tokens:
        user.spotify_refresh_token = tokens["refresh_token"]
    return tokens["access_token"]


async def main() -> int:
    settings = get_settings()
    SessionLocal = _get_session_local()
    db = SessionLocal()
    try:
        users = db.query(DimUser).all()
        logger.info("Found %d user(s) in dim_users", len(users))
        if not users:
            return 0

        total_updated = 0

        for user in users:
            logger.info("Processing user %s (%s)", user.spotify_id, user.display_name)

            try:
                access_token = await refresh_token_for_user(user, settings)
                db.commit()
                logger.info("Token refreshed for %s", user.spotify_id)
            except Exception as exc:
                logger.error("Token refresh failed for %s: %s", user.spotify_id, exc)
                continue

            client = SpotifyClient(access_token=access_token)

            # Fetch top artists across all time_ranges to maximize coverage
            for time_range in ("short_term", "medium_term", "long_term"):
                try:
                    raw = await client.get_top_artists(time_range=time_range, limit=50)
                except Exception as exc:
                    logger.warning("get_top_artists(%s) failed: %s", time_range, exc)
                    continue

                items = raw.get("items", [])
                logger.info("time_range=%s -> %d artists from Spotify", time_range, len(items))

                for a in items:
                    spotify_id = a.get("id")
                    followers_total = (a.get("followers") or {}).get("total")
                    if not spotify_id or followers_total is None:
                        continue

                    existing = (
                        db.query(DimArtist)
                        .filter(DimArtist.spotify_id == spotify_id)
                        .first()
                    )
                    if existing and existing.followers_count != followers_total:
                        existing.followers_count = followers_total
                        # also refresh genres if Spotify provided some
                        if a.get("genres"):
                            existing.genres = a["genres"]
                        total_updated += 1

                db.commit()

        logger.info("Backfill done: %d artist row(s) updated", total_updated)
        return total_updated
    finally:
        db.close()


if __name__ == "__main__":
    updated = asyncio.run(main())
    sys.exit(0 if updated >= 0 else 1)
