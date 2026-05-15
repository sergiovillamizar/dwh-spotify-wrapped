"""
app/v1/routers/history.py
Listening history endpoints — reads from fact_listening_history.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import DimUser, FactListeningHistory, get_db
from app.v1.dependencies import get_current_user
from app.v1.schemas.history import RecentlyPlayedResponse

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/recently-played", response_model=RecentlyPlayedResponse)
async def get_recently_played(
    before: Optional[int] = None,
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecentlyPlayedResponse:
    query = db.query(FactListeningHistory).filter(
        FactListeningHistory.user_id == current_user.user_id
    )
    if before is not None:
        before_dt = datetime.utcfromtimestamp(before / 1000)
        query = query.filter(FactListeningHistory.played_at < before_dt)
    items = query.order_by(FactListeningHistory.played_at.desc()).limit(50).all()
    cursor_next_ms: Optional[int] = (
        int(items[-1].played_at.timestamp() * 1000) if items else None
    )
    return RecentlyPlayedResponse(items=items, total=len(items), cursor_next_ms=cursor_next_ms)
