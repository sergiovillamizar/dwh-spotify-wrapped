"""
tests/test_history.py
Tests for the listening history endpoints.

Coverage:
  - GET /v1/history/peak-hour empty history → 24 zero-filled buckets, peak_hour=None
  - GET /v1/history/peak-hour with data → correct peak hour and total
  - GET /v1/history/peak-hour requires authentication
  - GET /v1/history/genres empty / ordering / limit / null-tag exclusion

Project:  dwh-spotify-wrapped
Author:   Didier
"""

from datetime import datetime, timedelta

import pytest

from app.core.database import DimArtist, DimTrack, FactListeningHistory


def _is_sqlite(db_session) -> bool:
    return db_session.bind.dialect.name == "sqlite"


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


def _make_artist(db_session, spotify_id, tags):
    artist = DimArtist(
        spotify_id=spotify_id,
        name=f"Artist {spotify_id}",
        popularity=50,
        followers_count=1000,
        genres="[]",
        lastfm_tags=tags,
        loaded_at=datetime.utcnow(),
    )
    db_session.add(artist)
    db_session.flush()
    return artist


def _make_track(db_session, artist_id, spotify_id):
    track = DimTrack(
        spotify_id=spotify_id,
        name=f"Track {spotify_id}",
        artist_id=artist_id,
        album_name="Album",
        duration_ms=200000,
        popularity=60,
        explicit=False,
        loaded_at=datetime.utcnow(),
    )
    db_session.add(track)
    db_session.flush()
    return track


def _add_plays(db_session, user_id, track_id, artist_id, n, base_dt):
    for i in range(n):
        fact = FactListeningHistory(
            user_id=user_id,
            track_id=track_id,
            artist_id=artist_id,
            played_at=base_dt + timedelta(minutes=i),
            hour_of_day=12,
            day_of_week="monday",
            hour_of_day_cot=7,
            day_of_week_cot="monday",
            context_type="playlist",
        )
        db_session.add(fact)
    db_session.flush()


class TestGenresEndpoint:
    def test_genres_empty_returns_empty_list(self, client, auth_headers, db_session):
        """No plays → items=[], total=0."""
        if _is_sqlite(db_session):
            pytest.skip("UNNEST/cardinality are PostgreSQL-specific")
        response = client.get("/v1/history/genres", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body == {"items": [], "total": 0}

    def test_genres_returns_top_n_ordered_desc(
        self, client, auth_headers, db_session, sample_user
    ):
        """3 artists with different tags played varying times → ordered by count desc."""
        if _is_sqlite(db_session):
            pytest.skip("UNNEST/cardinality are PostgreSQL-specific")
        a1 = _make_artist(db_session, "a1", ["reggaeton"])
        a2 = _make_artist(db_session, "a2", ["latin pop"])
        a3 = _make_artist(db_session, "a3", ["rock"])
        t1 = _make_track(db_session, a1.artist_id, "t1")
        t2 = _make_track(db_session, a2.artist_id, "t2")
        t3 = _make_track(db_session, a3.artist_id, "t3")
        _add_plays(db_session, sample_user.user_id, t1.track_id, a1.artist_id, 5, datetime(2026, 5, 18, 1, 0))
        _add_plays(db_session, sample_user.user_id, t2.track_id, a2.artist_id, 3, datetime(2026, 5, 18, 2, 0))
        _add_plays(db_session, sample_user.user_id, t3.track_id, a3.artist_id, 1, datetime(2026, 5, 18, 3, 0))

        response = client.get("/v1/history/genres", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()["items"]
        assert [it["genre"] for it in items] == ["reggaeton", "latin pop", "rock"]
        assert [it["count"] for it in items] == [5, 3, 1]

    def test_genres_respects_limit(
        self, client, auth_headers, db_session, sample_user
    ):
        """12 distinct genres → ?limit=5 returns 5."""
        if _is_sqlite(db_session):
            pytest.skip("UNNEST/cardinality are PostgreSQL-specific")
        for i in range(12):
            art = _make_artist(db_session, f"art{i}", [f"genre{i}"])
            trk = _make_track(db_session, art.artist_id, f"trk{i}")
            _add_plays(
                db_session, sample_user.user_id, trk.track_id, art.artist_id,
                12 - i, datetime(2026, 5, 18, 1, 0) + timedelta(hours=i),
            )
        response = client.get("/v1/history/genres?limit=5", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 5
        assert len(body["items"]) == 5

    def test_genres_excludes_null_lastfm_tags(
        self, client, auth_headers, db_session, sample_user
    ):
        """Artist with lastfm_tags=NULL and plays should not appear in results."""
        if _is_sqlite(db_session):
            pytest.skip("UNNEST/cardinality are PostgreSQL-specific")
        a_null = _make_artist(db_session, "anull", None)
        a_ok = _make_artist(db_session, "aok", ["jazz"])
        t_null = _make_track(db_session, a_null.artist_id, "tnull")
        t_ok = _make_track(db_session, a_ok.artist_id, "tok")
        _add_plays(db_session, sample_user.user_id, t_null.track_id, a_null.artist_id, 10, datetime(2026, 5, 18, 1, 0))
        _add_plays(db_session, sample_user.user_id, t_ok.track_id, a_ok.artist_id, 2, datetime(2026, 5, 18, 5, 0))

        response = client.get("/v1/history/genres", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()["items"]
        assert [it["genre"] for it in items] == ["jazz"]
        assert items[0]["count"] == 2

    def test_genres_requires_auth(self, client):
        response = client.get("/v1/history/genres")
        assert response.status_code in (401, 422)
