"""
api.py — Aggregated v1 API router
Author: Didier
Version: 1.0.0

Mounts all sub-routers under the /v1 prefix.  Each router is included here;
the /v1 prefix itself is applied when api_router is included in main.py via:

    app.include_router(api_router, prefix="/v1")

Router prefix notes:
- auth  : no prefix on the router object → must pass prefix="/auth" here
           → final paths: /v1/auth/login, /v1/auth/callback
- others: each router already declares its own prefix internally
           → include_router with no extra prefix to avoid duplication
"""

from fastapi import APIRouter

from app.v1.routers import auth, artists, etl, history, profile, tracks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profile.router)
api_router.include_router(artists.router)
api_router.include_router(tracks.router)
api_router.include_router(history.router)
api_router.include_router(etl.router)
