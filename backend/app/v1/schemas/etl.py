from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ETLRunResponse(BaseModel):
    audit_id: int
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    history_new: int
    history_skipped: int
    artists_new: int
    tracks_new: int
    cursor_next_ms: Optional[int] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ETLStatusResponse(BaseModel):
    runs: list[ETLRunResponse]
    total: int
