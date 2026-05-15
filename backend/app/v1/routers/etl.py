"""
app/v1/routers/etl.py
ETL trigger and status endpoints.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import DimUser, ETLAudit, get_db
from app.v1.dependencies import get_current_user
from app.v1.schemas.etl import ETLRunResponse, ETLStatusResponse
from app.v1.services.etl_service import run_etl

router = APIRouter(prefix="/etl", tags=["etl"])


@router.post("/run", response_model=ETLRunResponse)
async def run_etl_endpoint(
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ETLRunResponse:
    audit = await run_etl(current_user, db, settings)
    return audit


@router.get("/status", response_model=ETLStatusResponse)
def get_etl_status(
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ETLStatusResponse:
    runs = (
        db.query(ETLAudit)
        .filter(ETLAudit.spotify_user_id == current_user.spotify_id)
        .order_by(ETLAudit.started_at.desc())
        .limit(20)
        .all()
    )
    return ETLStatusResponse(runs=runs, total=len(runs))
