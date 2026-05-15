"""
app/v1/routers/artists.py
Artists endpoints — live fetch from Spotify, upsert to dim_artists.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import DimArtist, DimUser, get_db
from app.core.spotify_client import SpotifyClient
from app.v1.dependencies import get_current_user
from app.v1.schemas.artists import ArtistResponse, TopArtistsResponse

router = APIRouter(prefix="/artists", tags=["artists"])


@router.get("/top", response_model=TopArtistsResponse)
async def get_top_artists(
    time_range: str = "medium_term",
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TopArtistsResponse:
    client = SpotifyClient(access_token=current_user.spotify_access_token)
    raw = await client.get_top_artists(time_range=time_range, limit=50)
    artists: list[DimArtist] = []
    for a in raw.get("items", []):
        existing = db.query(DimArtist).filter(DimArtist.spotify_id == a["id"]).first()
        if not existing:
            existing = DimArtist(
                spotify_id=a["id"],
                name=a["name"],
                popularity=a.get("popularity"),
                followers_count=a.get("followers", {}).get("total"),
                genres=a.get("genres") or [],
                loaded_at=datetime.utcnow(),
            )
            db.add(existing)
            db.flush()
        artists.append(existing)
    db.commit()
    return TopArtistsResponse(items=artists, total=len(artists))
