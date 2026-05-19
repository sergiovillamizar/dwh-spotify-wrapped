"""
app/v1/routers/history.py
Listening history endpoints — reads from fact_listening_history.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import DimUser, FactListeningHistory, get_db
from app.v1.dependencies import get_current_user
from app.v1.schemas.history import (
    PeakHourBucket,
    PeakHourResponse,
    RecentlyPlayedResponse,
)

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


@router.get("/peak-hour", response_model=PeakHourResponse)
def get_peak_hour(
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PeakHourResponse:
    """Return the 24-hour listening distribution in Colombia time (UTC-5)."""
    rows = (
        db.query(
            FactListeningHistory.hour_of_day_cot,
            func.count().label("c"),
        )
        .filter(FactListeningHistory.user_id == current_user.user_id)
        .group_by(FactListeningHistory.hour_of_day_cot)
        .all()
    )

    counts: dict[int, int] = {hour: 0 for hour in range(24)}
    for hour, count in rows:
        if hour is not None and 0 <= hour <= 23:
            counts[int(hour)] = int(count)

    items = [PeakHourBucket(hour=h, count=counts[h]) for h in range(24)]
    total_plays = sum(counts.values())
    peak_hour: Optional[int] = (
        max(counts, key=counts.get) if total_plays > 0 else None
    )

    return PeakHourResponse(items=items, peak_hour=peak_hour, total_plays=total_plays)
