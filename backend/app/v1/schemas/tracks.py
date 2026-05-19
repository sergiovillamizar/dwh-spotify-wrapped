from typing import Optional

from pydantic import BaseModel, ConfigDict


class TrackResponse(BaseModel):
    track_id: int
    spotify_id: str
    name: str
    artist_id: Optional[int] = None
    artist_name: Optional[str] = None
    album_name: Optional[str] = None
    duration_ms: Optional[int] = None
    popularity: Optional[int] = None
    explicit: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class TopTracksResponse(BaseModel):
    items: list[TrackResponse]
    total: int
