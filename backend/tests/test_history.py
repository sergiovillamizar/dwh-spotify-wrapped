"""
tests/test_history.py
Tests for the listening history endpoints.

Coverage:
  - GET /v1/history/peak-hour empty history → 24 zero-filled buckets, peak_hour=None
  - GET /v1/history/peak-hour with data → correct peak hour and total
  - GET /v1/history/peak-hour requires authentication

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from datetime import datetime

from app.core.database import FactListeningHistory


def _insert_play(db_session, user_id, track_id, artist_id, played_at, hour_cot):
    fact = FactListeningHistory(
        user_id=user_id,
        track_id=track_id,
        artist_id=artist_id,
        played_at=played_at,
        hour_of_day=hour_cot,        # not used by the endpoint but kept consistent
        day_of_week="monday",
        hour_of_day_cot=hour_cot,
        day_of_week_cot="monday",
        context_type="playlist",
    )
    db_session.add(fact)
    db_session.flush()
    return fact


class TestPeakHourEndpoint:
    def test_peak_hour_empty_returns_zero_filled(self, client, auth_headers):
        """No plays → 24 buckets all count=0, peak_hour=None, total_plays=0."""
        response = client.get("/v1/history/peak-hour", headers=auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 24
        assert all(b["count"] == 0 for b in body["items"])
        assert [b["hour"] for b in body["items"]] == list(range(24))
        assert body["peak_hour"] is None
        assert body["total_plays"] == 0

    def test_peak_hour_with_data_returns_max(
        self, client, auth_headers, db_session, sample_user, sample_track, sample_artist
    ):
        """3 plays at hour 21 + 1 at hour 8 → peak_hour=21, total_plays=4."""
        for i in range(3):
            _insert_play(
                db_session,
                user_id=sample_user.user_id,
                track_id=sample_track.track_id,
                artist_id=sample_artist.artist_id,
                played_at=datetime(2026, 5, 18, 2, i, 0),  # arbitrary distinct timestamps
                hour_cot=21,
            )
        _insert_play(
            db_session,
            user_id=sample_user.user_id,
            track_id=sample_track.track_id,
            artist_id=sample_artist.artist_id,
            played_at=datetime(2026, 5, 18, 13, 0, 0),
            hour_cot=8,
        )

        response = client.get("/v1/history/peak-hour", headers=auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert body["total_plays"] == 4
        assert body["peak_hour"] == 21
        assert len(body["items"]) == 24
        by_hour = {b["hour"]: b["count"] for b in body["items"]}
        assert by_hour[21] == 3
        assert by_hour[8] == 1
        assert by_hour[0] == 0

    def test_peak_hour_requires_auth(self, client):
        response = client.get("/v1/history/peak-hour")
        assert response.status_code == 401
