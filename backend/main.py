"""
main.py
FastAPI application entry point for Mi Spotify Wrapped backend.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

APP_VERSION = "0.1.1"

app = FastAPI(
    title="Mi Spotify Wrapped API",
    version=APP_VERSION,
    description="Backend for Mi Spotify Wrapped — DWH analytics platform",
    docs_url="/v1/docs",
    redoc_url="/v1/redoc",
    openapi_url="/v1/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/v1/health", tags=["health"])
def health_check():
    """Liveness probe for Cloud Run."""
    return {"status": "ok", "service": "backend", "version": APP_VERSION}


@app.get("/v1/ready", tags=["health"])
def readiness_check():
    """Readiness probe — confirms app accepted traffic."""
    return {"ready": True, "service": "backend"}
