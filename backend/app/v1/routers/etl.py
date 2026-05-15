"""
app/v1/routers/etl.py
ETL trigger and status endpoints.

Endpoints:
  POST /etl/run         — user-triggered ETL (requires JWT)
  POST /etl/run-batch   — Cloud Scheduler nightly ETL (requires OIDC from sa-etl-scheduler)
  GET  /etl/status      — last 20 runs for the authenticated user

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import DimUser, ETLAudit, get_db
from app.v1.dependencies import get_current_user
from app.v1.schemas.etl import ETLRunResponse, ETLStatusResponse
from app.v1.services.etl_service import run_etl

router = APIRouter(prefix="/etl", tags=["etl"])
_log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# OIDC helper — verifies Cloud Scheduler identity token
# ---------------------------------------------------------------------------

def _verify_scheduler_oidc(request: Request, settings: Settings) -> None:
    """
    Validate the Google-signed OIDC token sent by Cloud Scheduler.

    Cloud Scheduler attaches `Authorization: Bearer <oidc_token>` where the
    token is signed by Google and carries `email == SCHEDULER_SA_EMAIL`.
    google-auth verifies signature, expiry, and audience automatically.
    Raises HTTP 403 on any validation failure.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    token = auth_header[7:]
    audience = settings.FRONTEND_URL  # LB base URL, e.g. https://34-54-8-28.nip.io

    try:
        # google-auth verifies signature using Google's public JWK keys,
        # checks expiry, and confirms the audience claim.
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=audience,
        )
        if info.get("email") != settings.SCHEDULER_SA_EMAIL:
            _log.warning(
                "scheduler_oidc: unexpected email=%s expected=%s",
                info.get("email"),
                settings.SCHEDULER_SA_EMAIL,
            )
            raise ValueError("SA email mismatch")
    except Exception as exc:
        _log.warning("scheduler_oidc: verification failed — %s", exc)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/run", response_model=ETLRunResponse)
async def run_etl_endpoint(
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ETLRunResponse:
    """Trigger incremental ETL for the authenticated user."""
    audit = await run_etl(current_user, db, settings)
    return audit


@router.post("/run-batch", status_code=status.HTTP_200_OK, include_in_schema=False)
async def run_batch_etl(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Nightly batch ETL — called exclusively by Cloud Scheduler.

    Security: verifies Google OIDC token issued to sa-etl-scheduler.
    Runs incremental ETL for every user present in dwh.dim_users.
    """
    _verify_scheduler_oidc(request, settings)

    users: list[DimUser] = db.query(DimUser).all()
    _log.info("batch_etl: starting for %d users", len(users))

    results = []
    for user in users:
        audit = await run_etl(user, db, settings)
        results.append(
            {
                "spotify_id": user.spotify_id,
                "status": audit.status,
                "history_new": audit.history_new,
                "error_message": audit.error_message,
            }
        )
        _log.info(
            "batch_etl: user=%s status=%s history_new=%s",
            user.spotify_id,
            audit.status,
            audit.history_new,
        )

    success = sum(1 for r in results if r["status"] == "success")
    _log.info("batch_etl: done processed=%d success=%d", len(results), success)

    return {
        "processed": len(results),
        "success": success,
        "failed": len(results) - success,
        "results": results,
    }


@router.get("/status", response_model=ETLStatusResponse)
def get_etl_status(
    current_user: DimUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ETLStatusResponse:
    """Return the last 20 ETL audit records for the authenticated user."""
    runs = (
        db.query(ETLAudit)
        .filter(ETLAudit.spotify_user_id == current_user.spotify_id)
        .order_by(ETLAudit.started_at.desc())
        .limit(20)
        .all()
    )
    return ETLStatusResponse(runs=runs, total=len(runs))
