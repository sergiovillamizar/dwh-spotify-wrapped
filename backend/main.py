"""
main.py
FastAPI application entry point for Mi Spotify Wrapped backend.

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.v1.api import api_router

APP_VERSION = "0.1.1"

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
_log = logging.getLogger(__name__)
_log.info("startup: main.py imported version=%s python=%s", APP_VERSION, sys.version.split()[0])

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

app.include_router(api_router, prefix="/v1")


@app.get("/", include_in_schema=False)
def root():
    return {"status": "ok", "version": APP_VERSION}


@app.get("/v1/health", tags=["health"])
def health_check():
    """Liveness probe for Cloud Run."""
    return {"status": "ok", "service": "backend", "version": APP_VERSION}


@app.get("/v1/ready", tags=["health"])
def readiness_check():
    """Readiness probe — confirms app accepted traffic."""
    return {"ready": True, "service": "backend"}


@app.on_event("startup")
async def on_startup() -> None:
    _log.info("startup: uvicorn ready version=%s", APP_VERSION)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Add Bearer JWT security scheme so Swagger shows the Authorize button
    schema.setdefault("components", {})
    schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Pega aquí el JWT obtenido de GET /v1/auth/login",
        }
    }
    # Apply security globally to all operations
    for path in schema.get("paths", {}).values():
        for operation in path.values():
            operation.setdefault("security", [{"bearerAuth": []}])
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
