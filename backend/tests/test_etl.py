"""
tests/test_etl.py
Tests for the ETL pipeline: incremental load, idempotency, COT columns, audit.

Coverage:
  - BE-07  POST /v1/etl/run creates audit record with correct metrics
  - BE-08  GET /v1/etl/status returns audit history
  - BE-11  Incremental load: cursor `after` fetches only new tracks
  - DB-07  Idempotency: running ETL twice doesn't duplicate fact rows
  - D8+    hour_of_day_cot and day_of_week_cot are populated correctly (COT = UTC-5)

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from app.core.database import (
    DimUser, DimArtist, DimTrack, FactListeningHistory, ETLAudit
)
from app.v1.services.etl_service import run_etl


# ---------------------------------------------------------------------------
# Helpers — Spotify API mock responses
# ---------------------------------------------------------------------------

def _make_artist(spotify_id="art_001", name="Artist One", popularity=70):
    return {
        "id": spotify_id,
        "name": name,
        "popularity": popularity,
        "followers": {"total": 10000},
        "genres": ["pop", "latin"],
    }


def _make_track(spotify_id="trk_001", name="Track One", artist_id="art_001", popularity=65):
    return {
        "id": spotify_id,
        "name": name,
        "artists": [{"id": artist_id, "name": "Artist One"}],
        "album": {"name": "Album One"},
        "duration_ms": 200000,
        "popularity": popularity,
        "explicit": False,
    }


def _make_played_item(track_spotify_id="trk_001", played_at="2026-05-18T20:00:00.000Z"):
    """Simulate a Spotify recently_played item."""
    return {
        "track": {
            "id": track_spotify_id,
            "name": "Track One",
            "artists": [{"id": "art_001", "name": "Artist One"}],
            "album": {"name": "Album One"},
            "duration_ms": 200000,
            "popularity": 65,
            "explicit": False,
        },
        "played_at": played_at,
        "context": {"type": "playlist"},
    }


# ---------------------------------------------------------------------------
# Unit — run_etl service
# ---------------------------------------------------------------------------

class TestRunETLService:
    """Tests for run_etl() with mocked Spotify client."""

    @pytest.fixture
    def spotify_mock(self):
        """Mock SpotifyClient with minimal valid responses."""
        mock = AsyncMock()
        mock.get_top_artists.return_value = {"items": [_make_artist()]}
        mock.get_top_tracks.return_value = {"items": [_make_track()]}
        mock.get_recently_played.return_value = {
            "items": [_make_played_item()]
        }
        return mock

    @pytest.mark.asyncio
    async def test_first_run_creates_audit_success(self, db_session, sample_user, settings, spotify_mock):
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            audit = await run_etl(sample_user, db_session, settings)

        assert audit.status == "success"
        assert audit.history_new == 1
        assert audit.started_at is not None
        assert audit.finished_at is not None

    @pytest.mark.asyncio
    async def test_first_run_inserts_fact_row(self, db_session, sample_user, settings, spotify_mock):
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            await run_etl(sample_user, db_session, settings)

        facts = db_session.query(FactListeningHistory).all()
        assert len(facts) == 1
        assert facts[0].user_id == sample_user.user_id

    @pytest.mark.asyncio
    async def test_idempotency_no_duplicate_facts(self, db_session, sample_user, settings, spotify_mock):
        """Running ETL twice with same played_at must not insert duplicates (DB-07)."""
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            audit1 = await run_etl(sample_user, db_session, settings)
            # Second run returns same item
            audit2 = await run_etl(sample_user, db_session, settings)

        facts = db_session.query(FactListeningHistory).all()
        assert len(facts) == 1          # only one row despite two runs
        assert audit2.history_skipped == 1

    @pytest.mark.asyncio
    async def test_cursor_after_used_on_incremental_run(self, db_session, sample_user, settings, spotify_mock):
        """Second run must pass cursor_after_ms from first run's cursor_next_ms (BE-11)."""
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            audit1 = await run_etl(sample_user, db_session, settings)
            await run_etl(sample_user, db_session, settings)

        # The second call to get_recently_played must use `after` kwarg
        calls = spotify_mock.get_recently_played.call_args_list
        assert len(calls) == 2
        # First call: no cursor (None)
        assert calls[0].kwargs.get("after") is None
        # Second call: cursor from first run
        assert calls[1].kwargs.get("after") == audit1.cursor_next_ms

    @pytest.mark.asyncio
    async def test_cot_columns_populated(self, db_session, sample_user, settings, spotify_mock):
        """hour_of_day_cot and day_of_week_cot must reflect COT (UTC-5)."""
        # played_at = 2026-05-18T20:00:00Z → COT = 15:00 (3 PM)
        spotify_mock.get_recently_played.return_value = {
            "items": [_make_played_item(played_at="2026-05-18T20:00:00.000Z")]
        }
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            await run_etl(sample_user, db_session, settings)

        fact = db_session.query(FactListeningHistory).first()
        assert fact.hour_of_day == 20       # UTC preserved
        assert fact.hour_of_day_cot == 15   # COT = UTC-5

    @pytest.mark.asyncio
    async def test_cot_day_of_week_midnight_crossover(self, db_session, sample_user, settings, spotify_mock):
        """A play at 01:00 UTC on Monday is Sunday COT (UTC-5 = previous day)."""
        # 2026-05-18 is Monday. 01:00 UTC Monday → 20:00 Sunday COT
        spotify_mock.get_recently_played.return_value = {
            "items": [_make_played_item(played_at="2026-05-18T01:00:00.000Z")]
        }
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            await run_etl(sample_user, db_session, settings)

        fact = db_session.query(FactListeningHistory).first()
        assert fact.day_of_week == "monday"     # UTC
        assert fact.day_of_week_cot == "sunday"  # COT crosses midnight

    @pytest.mark.asyncio
    async def test_spotify_error_records_failed_audit(self, db_session, sample_user, settings):
        """If Spotify raises an exception, audit.status must be 'error'."""
        broken_mock = AsyncMock()
        broken_mock.get_top_artists.side_effect = Exception("Spotify API down")

        with patch("app.v1.services.etl_service.SpotifyClient", return_value=broken_mock):
            audit = await run_etl(sample_user, db_session, settings)

        assert audit.status == "error"
        assert "Spotify API down" in audit.error_message

    @pytest.mark.asyncio
    async def test_audit_stores_cursor_next_ms(self, db_session, sample_user, settings, spotify_mock):
        """cursor_next_ms must equal the max played_at timestamp in ms."""
        played_at_str = "2026-05-18T20:00:00.000Z"
        spotify_mock.get_recently_played.return_value = {
            "items": [_make_played_item(played_at=played_at_str)]
        }
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            audit = await run_etl(sample_user, db_session, settings)

        expected_dt = datetime(2026, 5, 18, 20, 0, 0)
        expected_ms = int(expected_dt.timestamp() * 1000)
        assert audit.cursor_next_ms == expected_ms


# ---------------------------------------------------------------------------
# Integration — ETL endpoints
# ---------------------------------------------------------------------------

class TestETLEndpoints:
    @pytest.fixture
    def spotify_mock(self):
        mock = AsyncMock()
        mock.get_top_artists.return_value = {"items": []}
        mock.get_top_tracks.return_value = {"items": []}
        mock.get_recently_played.return_value = {"items": []}
        return mock

    def test_run_etl_without_auth_returns_401(self, client):
        response = client.post("/v1/etl/run")
        assert response.status_code == 401

    def test_run_etl_authenticated_returns_200(self, client, auth_headers, spotify_mock):
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            response = client.post("/v1/etl/run", headers=auth_headers)
        assert response.status_code == 200

    def test_run_etl_response_has_status_field(self, client, auth_headers, spotify_mock):
        with patch("app.v1.services.etl_service.SpotifyClient", return_value=spotify_mock):
            response = client.post("/v1/etl/run", headers=auth_headers)
        body = response.json()
        assert "status" in body
        assert body["status"] == "success"

    def test_etl_status_without_auth_returns_401(self, client):
        response = client.get("/v1/etl/status")
        assert response.status_code == 401

    def test_etl_status_authenticated_returns_200(self, client, auth_headers):
        response = client.get("/v1/etl/status", headers=auth_headers)
        assert response.status_code == 200

    def test_etl_status_returns_runs_list(self, client, auth_headers, db_session, sample_user):
        """After an ETL run, status must return that audit record."""
        audit = ETLAudit(
            spotify_user_id=sample_user.spotify_id,
            started_at=datetime.utcnow(),
            finished_at=datetime.utcnow(),
            status="success",
            history_new=5,
        )
        db_session.add(audit)
        db_session.flush()

        response = client.get("/v1/etl/status", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["runs"][0]["status"] == "success"

    def test_run_batch_without_oidc_returns_403(self, client):
        """POST /v1/etl/run-batch without OIDC token must be forbidden."""
        response = client.post("/v1/etl/run-batch", json={})
        assert response.status_code == 403
