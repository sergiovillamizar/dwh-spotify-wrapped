"""
app/v1/services/etl_service.py
ETL pipeline: Extract from Spotify API, Transform, Load into DWH.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import asyncio
from datetime import datetime, timedelta, timezone
import logging

# Colombia Standard Time: UTC-5 (no DST)
COT = timezone(timedelta(hours=-5))

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import DimArtist, DimTrack, DimUser, ETLAudit, FactListeningHistory
from app.core.lastfm_client import LastFmClient
from app.core.spotify_client import SpotifyClient

logger = logging.getLogger(__name__)

# Seconds between Last.fm API calls — stay under the 5 req/s rate limit.
_LASTFM_SLEEP = 0.25


async def enrich_all_artists(
    db: Session,
    settings: Settings,
) -> int:
    """
    Enrich ALL dim_artists rows that have not yet been tagged by Last.fm.

    Queries for artists where lastfm_tags IS NULL — regardless of whether they
    already have Spotify genres. This ensures every artist gets lastfm_listeners
    (popularity proxy) and lastfm_tags (genre tags) populated.

    For artists that already have Spotify genres, lastfm_tags is stored as an
    independent column and genres is NOT overwritten — Spotify data takes priority.
    For stubs (genres empty/null), genres is back-filled with Last.fm tags.

    Best-effort: any individual failure is logged and skipped.
    """
    if not settings.LASTFM_API_KEY:
        logger.debug("LASTFM_API_KEY not set — skipping enrichment")
        return 0

    artists = (
        db.query(DimArtist)
        .filter(DimArtist.lastfm_tags == None)  # noqa: E711 — only un-enriched rows
        .all()
    )

    if not artists:
        return 0

    client = LastFmClient(api_key=settings.LASTFM_API_KEY)
    enriched = 0

    for artist in artists:
        info = await client.get_artist_info(artist.name)
        if info:
            if info["tags"]:
                artist.lastfm_tags = info["tags"]
                # Back-fill genres only if Spotify had none
                has_spotify_genres = artist.genres and func.cardinality(artist.genres) != 0
                if not artist.genres or len(artist.genres) == 0:
                    artist.genres = info["tags"]
            if info["listeners"] is not None:
                artist.lastfm_listeners = info["listeners"]
            enriched += 1
            logger.info(
                "Enriched artist %r via Last.fm: tags=%s listeners=%s",
                artist.name,
                info["tags"],
                info["listeners"],
            )
        await asyncio.sleep(_LASTFM_SLEEP)

    return enriched


async def enrich_artists_followers(
    db: Session,
    access_token: str,
) -> int:
    """
    Back-fill followers_count for dim_artists stubs that have it as NULL.

    Artists created from recently_played only carry spotify_id + name;
    followers_count is only available via GET /artists?ids=... (batch).
    Calls Spotify in batches of 50. Best-effort: failures are logged and skipped.

    Returns:
        Number of artists updated.
    """
    stubs = (
        db.query(DimArtist)
        .filter(DimArtist.followers_count == None)  # noqa: E711
        .all()
    )
    if not stubs:
        logger.info("Spotify followers enrichment: no stubs with NULL followers_count")
        return 0

    logger.info("Spotify followers enrichment: %d artist(s) with NULL followers_count", len(stubs))
    client = SpotifyClient(access_token=access_token)
    updated = 0

    # Process in batches of 50 (Spotify API limit)
    for i in range(0, len(stubs), 50):
        batch = stubs[i : i + 50]
        ids = [a.spotify_id for a in batch]
        logger.info(
            "Spotify followers enrichment batch %d: fetching %d artists",
            i // 50,
            len(ids),
        )
        try:
            artists_data = await client.get_artists_batch(ids)
            id_to_data = {a["id"]: a for a in artists_data if a}
            logger.info(
                "Spotify followers enrichment batch %d: got %d responses",
                i // 50,
                len(id_to_data),
            )
            for artist in batch:
                data = id_to_data.get(artist.spotify_id)
                if data:
                    artist.followers_count = (data.get("followers") or {}).get("total")
                    updated += 1
        except Exception as exc:
            logger.warning(
                "Spotify batch artists fetch failed (batch %d, ids=%s): %s",
                i // 50,
                ids[:3],  # log first 3 IDs for debugging
                exc,
            )

    logger.info("Spotify followers enrichment: %d artist(s) updated", updated)
    return updated


async def maybe_refresh_token(user: DimUser, db: Session, settings: Settings) -> str:
    if user.token_expires_at and user.token_expires_at - datetime.utcnow() < timedelta(minutes=5):
        client = SpotifyClient(access_token="")
        tokens = await client.refresh_token(settings.SPOTIFY_CLIENT_ID, user.spotify_refresh_token)
        user.spotify_access_token = tokens["access_token"]
        user.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
        if "refresh_token" in tokens:
            user.spotify_refresh_token = tokens["refresh_token"]
        db.add(user)
        db.commit()
    return user.spotify_access_token


async def run_etl(user: DimUser, db: Session, settings: Settings) -> ETLAudit:
    audit = ETLAudit(
        spotify_user_id=user.spotify_id,
        started_at=datetime.utcnow(),
        status="error",
    )
    db.add(audit)
    db.flush()

    try:
        access_token = await maybe_refresh_token(user, db, settings)
        client = SpotifyClient(access_token=access_token)

        last_audit = (
            db.query(ETLAudit)
            .filter(
                ETLAudit.spotify_user_id == user.spotify_id,
                ETLAudit.status == "success",
            )
            .order_by(ETLAudit.started_at.desc())
            .first()
        )
        # cursor_next_ms holds the played_at of the newest track from the last
        # successful run. Pass it as `after` so Spotify returns only tracks
        # played AFTER that point — true incremental load.
        cursor_after_ms: int | None = last_audit.cursor_next_ms if last_audit else None
        audit.cursor_after_ms = cursor_after_ms

        top_artists_raw = await client.get_top_artists(limit=50)
        top_tracks_raw = await client.get_top_tracks(limit=50)
        recently_played_raw = await client.get_recently_played(limit=50, after=cursor_after_ms)

        artists_data: list[dict] = top_artists_raw.get("items", [])
        tracks_data: list[dict] = top_tracks_raw.get("items", [])
        history_items: list[dict] = recently_played_raw.get("items", [])

        artists_new = 0
        artists_skipped = 0
        artist_id_map: dict[str, int] = {}

        for a in artists_data:
            existing = db.query(DimArtist).filter(DimArtist.spotify_id == a["id"]).first()
            if existing:
                # Always refresh followers/genres from top-artists response (full objects)
                followers_total = (a.get("followers") or {}).get("total")
                if followers_total is not None:
                    existing.followers_count = followers_total
                existing.genres = a.get("genres") or existing.genres
                artists_skipped += 1
                artist_id_map[a["id"]] = existing.artist_id
            else:
                new_artist = DimArtist(
                    spotify_id=a["id"],
                    name=a["name"],
                    popularity=a.get("popularity"),
                    followers_count=a.get("followers", {}).get("total"),
                    genres=a.get("genres") or [],
                    loaded_at=datetime.utcnow(),
                )
                db.add(new_artist)
                db.flush()
                artist_id_map[a["id"]] = new_artist.artist_id
                artists_new += 1

        tracks_new = 0
        tracks_skipped = 0
        track_id_map: dict[str, int] = {}

        for t in tracks_data:
            existing = db.query(DimTrack).filter(DimTrack.spotify_id == t["id"]).first()
            if existing:
                tracks_skipped += 1
                track_id_map[t["id"]] = existing.track_id
            else:
                primary_artist: dict = t["artists"][0] if t.get("artists") else {}
                art_fk: int | None = artist_id_map.get(primary_artist.get("id", ""))
                if art_fk is None and primary_artist.get("id"):
                    art_existing = (
                        db.query(DimArtist)
                        .filter(DimArtist.spotify_id == primary_artist["id"])
                        .first()
                    )
                    if art_existing:
                        art_fk = art_existing.artist_id
                    else:
                        stub = DimArtist(
                            spotify_id=primary_artist["id"],
                            name=primary_artist.get("name", "Unknown"),
                            genres=[],
                            loaded_at=datetime.utcnow(),
                        )
                        db.add(stub)
                        db.flush()
                        art_fk = stub.artist_id
                        artist_id_map[primary_artist["id"]] = art_fk

                new_track = DimTrack(
                    spotify_id=t["id"],
                    name=t["name"],
                    artist_id=art_fk,
                    album_name=t.get("album", {}).get("name"),
                    duration_ms=t.get("duration_ms"),
                    popularity=t.get("popularity"),
                    explicit=t.get("explicit", False),
                    loaded_at=datetime.utcnow(),
                )
                db.add(new_track)
                db.flush()
                track_id_map[t["id"]] = new_track.track_id
                tracks_new += 1

        history_new = 0
        history_skipped = 0
        max_played_ms: int | None = None

        for item in history_items:
            track_raw: dict = item.get("track", {})
            track_spotify_id: str | None = track_raw.get("id")
            played_at_str: str = item.get("played_at", "")

            try:
                played_at = datetime.strptime(played_at_str, "%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                played_at = datetime.strptime(played_at_str, "%Y-%m-%dT%H:%M:%SZ")

            played_at_ms = int(played_at.timestamp() * 1000)
            if max_played_ms is None or played_at_ms > max_played_ms:
                max_played_ms = played_at_ms

            track_fk: int | None = track_id_map.get(track_spotify_id or "")
            if track_fk is None and track_spotify_id:
                t_existing = (
                    db.query(DimTrack).filter(DimTrack.spotify_id == track_spotify_id).first()
                )
                if t_existing:
                    track_fk = t_existing.track_id
                else:
                    primary_artist = track_raw["artists"][0] if track_raw.get("artists") else {}
                    art_fk = artist_id_map.get(primary_artist.get("id", ""))
                    if art_fk is None and primary_artist.get("id"):
                        art_ex = (
                            db.query(DimArtist)
                            .filter(DimArtist.spotify_id == primary_artist["id"])
                            .first()
                        )
                        if art_ex:
                            art_fk = art_ex.artist_id
                        else:
                            stub = DimArtist(
                                spotify_id=primary_artist["id"],
                                name=primary_artist.get("name", "Unknown"),
                                genres=[],
                                loaded_at=datetime.utcnow(),
                            )
                            db.add(stub)
                            db.flush()
                            art_fk = stub.artist_id
                            artist_id_map[primary_artist["id"]] = art_fk

                    stub_track = DimTrack(
                        spotify_id=track_spotify_id,
                        name=track_raw.get("name", "Unknown"),
                        artist_id=art_fk,
                        album_name=track_raw.get("album", {}).get("name"),
                        duration_ms=track_raw.get("duration_ms"),
                        popularity=track_raw.get("popularity"),
                        explicit=track_raw.get("explicit", False),
                        loaded_at=datetime.utcnow(),
                    )
                    db.add(stub_track)
                    db.flush()
                    track_fk = stub_track.track_id
                    track_id_map[track_spotify_id] = track_fk

            if track_fk is None:
                history_skipped += 1
                continue

            track_obj = db.get(DimTrack, track_fk)
            fact_artist_id: int | None = track_obj.artist_id if track_obj else None

            context_type: str | None = (
                item.get("context", {}).get("type") if item.get("context") else None
            )

            existing_fact = (
                db.query(FactListeningHistory)
                .filter(
                    FactListeningHistory.user_id == user.user_id,
                    FactListeningHistory.played_at == played_at,
                )
                .first()
            )

            if existing_fact:
                history_skipped += 1
            else:
                # Convert UTC played_at to COT (UTC-5) for Colombia analytics
                played_at_cot = played_at.replace(tzinfo=timezone.utc).astimezone(COT)

                fact = FactListeningHistory(
                    user_id=user.user_id,
                    track_id=track_fk,
                    artist_id=fact_artist_id,
                    played_at=played_at,
                    hour_of_day=played_at.hour,              # UTC — preserved
                    day_of_week=played_at.strftime("%A").lower(),  # UTC — preserved
                    hour_of_day_cot=played_at_cot.hour,     # COT — para analíticas Colombia
                    day_of_week_cot=played_at_cot.strftime("%A").lower(),  # COT
                    context_type=context_type,
                )
                db.add(fact)
                history_new += 1

        # ── Last.fm enrichment ─────────────────────────────────────────────
        # Enrich ALL artists not yet tagged by Last.fm — includes artists with
        # Spotify genres so that lastfm_tags and lastfm_listeners are always populated.
        # Best-effort: failures are logged but don't fail the ETL.
        try:
            enriched_count = await enrich_all_artists(db, settings)
            logger.info("Last.fm enrichment: %d artist(s) enriched", enriched_count)
        except Exception as exc:
            logger.warning("Last.fm enrichment step failed (non-fatal): %s", exc)

        # ── Spotify followers enrichment ────────────────────────────────────
        # Back-fill followers_count for stubs created from recently_played.
        # Uses GET /artists?ids=... batch (max 50 IDs per call).
        # Best-effort: failures are logged but don't fail the ETL.
        try:
            followers_updated = await enrich_artists_followers(db, access_token)
            logger.info("Spotify followers enrichment: %d artist(s) updated", followers_updated)
        except Exception as exc:
            logger.warning("Spotify followers enrichment step failed (non-fatal): %s", exc)

        db.commit()

        audit.status = "success"
        audit.finished_at = datetime.utcnow()
        audit.duration_ms = int((audit.finished_at - audit.started_at).total_seconds() * 1000)
        audit.artists_new = artists_new
        audit.artists_skipped = artists_skipped
        audit.tracks_new = tracks_new
        audit.tracks_skipped = tracks_skipped
        audit.history_new = history_new
        audit.history_skipped = history_skipped
        audit.cursor_next_ms = max_played_ms
        db.commit()

    except Exception as e:
        db.rollback()
        audit.status = "error"
        audit.error_message = str(e)
        audit.finished_at = datetime.utcnow()
        audit.duration_ms = int((audit.finished_at - audit.started_at).total_seconds() * 1000)
        db.add(audit)
        db.commit()

    return audit
