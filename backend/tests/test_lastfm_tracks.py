"""
tests/test_lastfm_tracks.py
Tests for enrich_all_tracks() — Last.fm track popularity backfill.

Coverage:
  - Skips tracks that already have lastfm_playcount populated
  - Populates lastfm_listeners and lastfm_playcount when client returns data
  - Handles client returning None gracefully (no fields written)

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch

from app.core.database import DimArtist, DimTrack
from app.v1.services.etl_service import enrich_all_tracks


@pytest.fixture
def artist_row(db_session):
    artist = DimArtist(
        spotify_id="art_lfm_001",
        name="Some Artist",
        genres="[]",
        loaded_at=datetime.utcnow(),
    )
    db_session.add(artist)
    db_session.flush()
    return artist


@pytest.fixture
def fresh_track(db_session, artist_row):
    """Track with lastfm_playcount NULL — eligible for enrichment."""
    track = DimTrack(
        spotify_id="trk_lfm_001",
        name="Some Track",
        artist_id=artist_row.artist_id,
        album_name="Some Album",
        duration_ms=210000,
        popularity=50,
        explicit=False,
        loaded_at=datetime.utcnow(),
    )
    db_session.add(track)
    db_session.flush()
    return track


@pytest.fixture
def already_enriched_track(db_session, artist_row):
    """Track that already has lastfm_playcount — must be skipped."""
    track = DimTrack(
        spotify_id="trk_lfm_002",
        name="Already Enriched",
        artist_id=artist_row.artist_id,
        album_name="Album",
        duration_ms=180000,
        popularity=60,
        explicit=False,
        lastfm_listeners=12345,
        lastfm_playcount=67890,
        loaded_at=datetime.utcnow(),
    )
    db_session.add(track)
    db_session.flush()
    return track


class TestEnrichAllTracks:
    @pytest.mark.asyncio
    async def test_populates_fields_when_client_returns_data(
        self, db_session, settings, fresh_track
    ):
        settings.LASTFM_API_KEY = "fake_key"
        client_mock = AsyncMock()
        client_mock.get_track_info.return_value = {
            "listeners": 1000,
            "playcount": 5000,
        }

        with patch(
            "app.v1.services.etl_service.LastFmClient", return_value=client_mock
        ):
            count = await enrich_all_tracks(db_session, settings)

        db_session.flush()
        db_session.refresh(fresh_track)
        assert count == 1
        assert fresh_track.lastfm_listeners == 1000
        assert fresh_track.lastfm_playcount == 5000
        client_mock.get_track_info.assert_awaited_once_with(
            "Some Artist", "Some Track"
        )

    @pytest.mark.asyncio
    async def test_skips_already_enriched_tracks(
        self, db_session, settings, already_enriched_track
    ):
        settings.LASTFM_API_KEY = "fake_key"
        client_mock = AsyncMock()
        client_mock.get_track_info.return_value = {
            "listeners": 999,
            "playcount": 999,
        }

        with patch(
            "app.v1.services.etl_service.LastFmClient", return_value=client_mock
        ):
            count = await enrich_all_tracks(db_session, settings)

        db_session.refresh(already_enriched_track)
        assert count == 0
        # Unchanged
        assert already_enriched_track.lastfm_listeners == 12345
        assert already_enriched_track.lastfm_playcount == 67890
        client_mock.get_track_info.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_handles_client_returning_none(
        self, db_session, settings, fresh_track
    ):
        settings.LASTFM_API_KEY = "fake_key"
        client_mock = AsyncMock()
        client_mock.get_track_info.return_value = None

        with patch(
            "app.v1.services.etl_service.LastFmClient", return_value=client_mock
        ):
            count = await enrich_all_tracks(db_session, settings)

        db_session.refresh(fresh_track)
        assert count == 0
        assert fresh_track.lastfm_listeners is None
        assert fresh_track.lastfm_playcount is None

    @pytest.mark.asyncio
    async def test_returns_zero_when_no_api_key(
        self, db_session, settings, fresh_track
    ):
        settings.LASTFM_API_KEY = ""
        count = await enrich_all_tracks(db_session, settings)
        assert count == 0
        db_session.refresh(fresh_track)
        assert fresh_track.lastfm_playcount is None
