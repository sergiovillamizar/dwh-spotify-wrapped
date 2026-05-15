"""
app/v1/services/etl_service.py
ETL pipeline: Extract from Spotify API, Transform, Load into DWH.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import DimArtist, DimTrack, DimUser, ETLAudit, FactListeningHistory
from app.core.spotify_client import SpotifyClient


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
        cursor_before_ms: int | None = last_audit.cursor_next_ms if last_audit else None
        audit.cursor_after_ms = cursor_before_ms

        top_artists_raw = await client.get_top_artists(limit=50)
        top_tracks_raw = await client.get_top_tracks(limit=50)
        recently_played_raw = await client.get_recently_played(limit=50, before=cursor_before_ms)

        artists_data: list[dict] = top_artists_raw.get("items", [])
        tracks_data: list[dict] = top_tracks_raw.get("items", [])
        history_items: list[dict] = recently_played_raw.get("items", [])

        artists_new = 0
        artists_skipped = 0
        artist_id_map: dict[str, int] = {}

        for a in artists_data:
            existing = db.query(DimArtist).filter(DimArtist.spotify_id == a["id"]).first()
            if existing:
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
                fact = FactListeningHistory(
                    user_id=user.user_id,
                    track_id=track_fk,
                    artist_id=fact_artist_id,
                    played_at=played_at,
                    hour_of_day=played_at.hour,
                    day_of_week=played_at.strftime("%A").lower(),
                    context_type=context_type,
                )
                db.add(fact)
                history_new += 1

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
