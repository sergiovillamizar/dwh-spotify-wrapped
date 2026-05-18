from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

# Engine and SessionLocal are initialized lazily on first DB access so that
# missing env vars do not crash the process at import time (startup probe safe).
_engine = None
_SessionLocal = None


def _get_session_local():
    global _engine, _SessionLocal
    if _SessionLocal is None:
        settings = get_settings()
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _SessionLocal


class Base(DeclarativeBase):
    pass


class DimUser(Base):
    __tablename__ = "dim_users"
    __table_args__ = {"schema": "dwh"}

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    spotify_id = Column(String(100), nullable=False)
    display_name = Column(String(255))
    email = Column(String(255))
    country = Column(String(10))
    followers = Column(Integer)
    product = Column(String(20))
    spotify_access_token = Column(Text)
    spotify_refresh_token = Column(Text)
    token_expires_at = Column(DateTime)
    loaded_at = Column(DateTime)


class PKCESession(Base):
    __tablename__ = "pkce_sessions"

    state = Column(String(128), primary_key=True)
    verifier = Column(Text, nullable=False)
    created_at = Column(DateTime)


class DimArtist(Base):
    __tablename__ = "dim_artists"
    __table_args__ = {"schema": "dwh"}

    artist_id = Column(Integer, primary_key=True, autoincrement=True)
    spotify_id = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    popularity = Column(Integer)
    followers_count = Column(Integer)
    genres = Column(ARRAY(String))
    loaded_at = Column(DateTime)


class DimTrack(Base):
    __tablename__ = "dim_tracks"
    __table_args__ = {"schema": "dwh"}

    track_id = Column(Integer, primary_key=True, autoincrement=True)
    spotify_id = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    artist_id = Column(Integer)
    album_name = Column(String(255))
    duration_ms = Column(Integer)
    popularity = Column(Integer)
    explicit = Column(Boolean)
    loaded_at = Column(DateTime)


class FactListeningHistory(Base):
    __tablename__ = "fact_listening_history"
    __table_args__ = {"schema": "dwh"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    track_id = Column(Integer, nullable=False)
    artist_id = Column(Integer, nullable=False)
    played_at = Column(DateTime, nullable=False)
    hour_of_day = Column(Integer)           # hora UTC (original)
    day_of_week = Column(String(10))        # día UTC (original)
    hour_of_day_cot = Column(Integer)       # hora COT (UTC-5) — para análisis Colombia
    day_of_week_cot = Column(String(10))    # día COT (UTC-5) — para análisis Colombia
    context_type = Column(String(50))


class ETLAudit(Base):
    __tablename__ = "etl_audit"
    __table_args__ = {"schema": "dwh"}

    audit_id = Column(Integer, primary_key=True, autoincrement=True)
    spotify_user_id = Column(String(100), nullable=False)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime)
    duration_ms = Column(Integer)
    status = Column(String(20), nullable=False)
    error_message = Column(Text)
    users_new = Column(Integer, default=0)
    artists_new = Column(Integer, default=0)
    artists_skipped = Column(Integer, default=0)
    tracks_new = Column(Integer, default=0)
    tracks_skipped = Column(Integer, default=0)
    history_new = Column(Integer, default=0)
    history_skipped = Column(Integer, default=0)
    cursor_after_ms = Column(BigInteger)
    cursor_next_ms = Column(BigInteger)


def get_db() -> Generator[Session, None, None]:
    db = _get_session_local()()
    try:
        yield db
    finally:
        db.close()
