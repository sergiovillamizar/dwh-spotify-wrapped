"""
app/v1/routers/tracks.py
Tracks endpoints — live fetch from Spotify, upsert to dim_tracks.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import DimArtist, DimTrack, DimUser, get_db
from app.core.spotify_client import SpotifyClient
from app.v1.dependencies import get_current_user
from app.v1.schemas.tracks import TopTracksResponse, TrackResponse
from app.v1.services.etl_service import maybe_refresh_token

router = APIRouter(prefix="/tracks", tags=["tracks"])


@router.get("/top", response_model=TopTracksResponse)
async def get_top_tracks(
    time_range: str = "medium_term",
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TopTracksResponse:
    access_token = await maybe_refresh_token(current_user, db, settings)
    client = SpotifyClient(access_token=access_token)
    raw = await client.get_top_tracks(time_range=time_range, limit=50)
    tracks: list[DimTrack] = []
    for t in raw.get("items", []):
        existing = db.query(DimTrack).filter(DimTrack.spotify_id == t["id"]).first()
        if existing:
            # Enrich stub records that were created without popularity data
            existing.popularity = t.get("popularity")
            existing.album_name = t.get("album", {}).get("name") or existing.album_name
        else:
            primary_artist: dict = t["artists"][0] if t.get("artists") else {}
            art_fk: int | None = None
            if primary_artist.get("id"):
                art_existing = (
                    db.query(DimArtist)
                    .filter(DimArtist.spotify_id == primary_artist["id"])
                    .first()
                )
                if art_existing:
                    art_fk = art_existing.artist_id
                else:
                    stub_artist = DimArtist(
                        spotify_id=primary_artist["id"],
                        name=primary_artist.get("name", "Unknown"),
                        genres=[],
                        loaded_at=datetime.utcnow(),
                    )
                    db.add(stub_artist)
                    db.flush()
                    art_fk = stub_artist.artist_id

            existing = DimTrack(
                spotify_id=t["id"],
                name=t["name"],
                artist_id=art_fk,
                album_name=t.get("album", {}).get("name"),
                duration_ms=t.get("duration_ms"),
                popularity=t.get("popularity"),
                explicit=t.get("explicit", False),
                loaded_at=datetime.utcnow(),
            )
            db.add(existing)
            db.flush()
        tracks.append(existing)
    db.commit()

    items: list[TrackResponse] = []
    for track in tracks:
        artist_name: str | None = None
        if track.artist_id is not None:
            artist = (
                db.query(DimArtist)
                .filter(DimArtist.artist_id == track.artist_id)
                .first()
            )
            if artist is not None:
                artist_name = artist.name
        items.append(
            TrackResponse.model_validate(track).model_copy(
                update={"artist_name": artist_name}
            )
        )

    return TopTracksResponse(items=items, total=len(items))
