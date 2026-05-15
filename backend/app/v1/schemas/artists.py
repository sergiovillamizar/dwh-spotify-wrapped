from typing import Optional

from pydantic import BaseModel, ConfigDict


class ArtistResponse(BaseModel):
    artist_id: int
    spotify_id: str
    name: str
    popularity: Optional[int] = None
    followers_count: Optional[int] = None
    genres: Optional[list[str]] = None

    model_config = ConfigDict(from_attributes=True)


class TopArtistsResponse(BaseModel):
    items: list[ArtistResponse]
    total: int
