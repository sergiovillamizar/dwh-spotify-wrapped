"""
tests/conftest.py
Shared fixtures for the backend test suite.

Strategy:
  - SQLite in-memory replaces Cloud SQL for full isolation (no external deps).
  - PostgreSQL-specific schema prefixes are stripped before table creation.
  - ARRAY(String) columns are replaced with JSON for SQLite compatibility.
  - get_db and get_settings FastAPI dependencies are overridden in every test.
  - Spotify HTTP calls are mocked via respx (no real network traffic).

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, DimUser, PKCESession, DimArtist, DimTrack, FactListeningHistory, ETLAudit
from app.core.config import Settings
from app.v1.services.auth_service import create_jwt

# ---------------------------------------------------------------------------
# SQLite-compatible engine — strips PostgreSQL schema prefixes
# ---------------------------------------------------------------------------

SQLITE_URL = "sqlite://"  # in-memory, destroyed after each test session


def _strip_schemas(target, connection, **kwargs):
    """Remove schema prefixes so SQLite can create the tables."""
    pass


@pytest.fixture(scope="function")
def engine():
    """Create a single SQLite engine for the entire test session."""
    eng = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
    )

    # Strip schema from all table metadata so SQLite accepts them
    for table in Base.metadata.tables.values():
        table.schema = None

    # ARRAY(String) columns aren't supported in SQLite — patch to JSON
    # SQLAlchemy's JSON type stores Python lists as JSON text in SQLite,
    # and transparently deserializes them back to lists on read.
    from sqlalchemy import JSON
    for col in DimArtist.__table__.columns:
        if col.name in ("genres", "lastfm_tags"):
            col.type = JSON()

    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)


@pytest.fixture
def db_session(engine):
    """Provide a transactional session rolled back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    TestingSession = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = TestingSession()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Test Settings — no real secrets needed
# ---------------------------------------------------------------------------

TEST_SETTINGS = Settings(
    SPOTIFY_CLIENT_ID="test_client_id",
    SPOTIFY_CLIENT_SECRET="test_client_secret",
    SPOTIFY_REDIRECT_URI="http://testserver/v1/auth/callback",
    SECRET_KEY="test_secret_key_that_is_long_enough_32chars",
    FRONTEND_URL="http://testserver",
    DB_PASSWORD="",
    CLOUD_SQL_INSTANCE="",
    DATABASE_URL="sqlite://",
)


@pytest.fixture
def settings():
    return TEST_SETTINGS


# ---------------------------------------------------------------------------
# FastAPI TestClient with overridden dependencies
# ---------------------------------------------------------------------------

@pytest.fixture
def client(db_session, settings):
    """TestClient with DB and settings overrides."""
    from main import app
    from app.core.database import get_db
    from app.core.config import get_settings

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_settings():
        return settings

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = override_get_settings

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Sample data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_user(db_session):
    """Insert a DimUser and return it."""
    user = DimUser(
        spotify_id="spotify_user_test_123",
        display_name="Test User",
        email="test@example.com",
        country="CO",
        followers=100,
        product="premium",
        spotify_access_token="access_token_test",
        spotify_refresh_token="refresh_token_test",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        loaded_at=datetime.utcnow(),
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def auth_headers(sample_user, settings):
    """Return Authorization header with a valid JWT for sample_user."""
    token = create_jwt(sample_user.spotify_id, sample_user.user_id, settings)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_artist(db_session):
    """Insert a DimArtist and return it."""
    artist = DimArtist(
        spotify_id="artist_test_001",
        name="Test Artist",
        popularity=75,
        followers_count=50000,
        genres="[]",  # stored as text in SQLite
        loaded_at=datetime.utcnow(),
    )
    db_session.add(artist)
    db_session.flush()
    return artist


@pytest.fixture
def sample_track(db_session, sample_artist):
    """Insert a DimTrack linked to sample_artist."""
    track = DimTrack(
        spotify_id="track_test_001",
        name="Test Track",
        artist_id=sample_artist.artist_id,
        album_name="Test Album",
        duration_ms=210000,
        popularity=80,
        explicit=False,
        loaded_at=datetime.utcnow(),
    )
    db_session.add(track)
    db_session.flush()
    return track
