"""
main.py
FastAPI application entry point for Mi Spotify Wrapped backend.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Mi Spotify Wrapped API",
    version="0.1.0",
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
    return {"status": "ok", "service": "backend", "version": "0.1.0"}
