from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class HistoryItemResponse(BaseModel):
    id: int
    track_id: int
    artist_id: int
    played_at: datetime
    hour_of_day: Optional[int] = None
    day_of_week: Optional[str] = None
    context_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecentlyPlayedResponse(BaseModel):
    items: list[HistoryItemResponse]
    total: int
    cursor_next_ms: Optional[int] = None
