"""
tests/test_auth.py
Tests for authentication: PKCE flow, JWT lifecycle, dependency guard.

Coverage:
  - BE-01  GET /v1/auth/login returns auth_url with PKCE params
  - BE-02  GET /v1/auth/callback rejects invalid state (404)
  - BE-09  Protected endpoints return 401 without valid JWT
  - Unit   create_jwt / decode_jwt round-trip
  - Unit   upsert_user creates / updates DimUser correctly

Project:  dwh-spotify-wrapped
Author:   Didier
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from jose import jwt

from app.core.database import DimUser, PKCESession
from app.v1.services.auth_service import create_jwt, decode_jwt, upsert_user
from app.core.spotify_client import generate_code_verifier, generate_code_challenge


# ---------------------------------------------------------------------------
# Unit — PKCE helpers
# ---------------------------------------------------------------------------

class TestPKCEHelpers:
    def test_code_verifier_length(self):
        """Verifier must be between 43 and 128 chars (RFC 7636)."""
        verifier = generate_code_verifier()
        assert 43 <= len(verifier) <= 128

    def test_code_challenge_is_base64url(self):
        """Challenge must be URL-safe base64 without padding."""
        verifier = generate_code_verifier()
        challenge = generate_code_challenge(verifier)
        # base64url chars only, no padding
        assert "=" not in challenge
        assert all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_" for c in challenge)

    def test_different_verifiers_produce_different_challenges(self):
        v1 = generate_code_verifier()
        v2 = generate_code_verifier()
        assert generate_code_challenge(v1) != generate_code_challenge(v2)


# ---------------------------------------------------------------------------
# Unit — JWT lifecycle
# ---------------------------------------------------------------------------

class TestJWT:
    def test_create_and_decode_round_trip(self, settings):
        token = create_jwt("spotify_abc", 42, settings)
        payload = decode_jwt(token, settings)
        assert payload["sub"] == "spotify_abc"
        assert payload["user_id"] == 42

    def test_expired_token_raises(self, settings):
        """Token expired in the past must raise JWTError."""
        from jose import JWTError
        payload = {
            "sub": "user_x",
            "user_id": 1,
            "exp": datetime.utcnow() - timedelta(seconds=1),
        }
        expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        with pytest.raises(JWTError):
            decode_jwt(expired_token, settings)

    def test_wrong_secret_raises(self, settings):
        from jose import JWTError
        token = create_jwt("user_y", 2, settings)
        bad_settings = settings.model_copy(update={"SECRET_KEY": "wrong_secret_key_32chars_________"})
        with pytest.raises(JWTError):
            decode_jwt(token, bad_settings)


# ---------------------------------------------------------------------------
# Unit — upsert_user
# ---------------------------------------------------------------------------

class TestUpsertUser:
    PROFILE = {
        "id": "spotify_new_user",
        "display_name": "New User",
        "email": "new@example.com",
        "country": "CO",
        "followers": {"total": 200},
        "product": "premium",
    }

    def test_creates_new_user(self, db_session):
        user = upsert_user(db_session, self.PROFILE, "acc", "ref", 3600)
        db_session.flush()
        assert user.spotify_id == "spotify_new_user"
        assert user.display_name == "New User"
        assert user.email == "new@example.com"
        assert user.user_id is not None

    def test_updates_existing_user(self, db_session):
        # First insert
        upsert_user(db_session, self.PROFILE, "acc1", "ref1", 3600)
        db_session.flush()

        # Update with new token
        updated_profile = {**self.PROFILE, "display_name": "Updated Name"}
        user = upsert_user(db_session, updated_profile, "acc2", "ref2", 3600)
        db_session.flush()

        all_users = db_session.query(DimUser).filter(
            DimUser.spotify_id == "spotify_new_user"
        ).all()
        assert len(all_users) == 1  # no duplicates
        assert all_users[0].display_name == "Updated Name"
        assert all_users[0].spotify_access_token == "acc2"


# ---------------------------------------------------------------------------
# Integration — GET /v1/auth/login
# ---------------------------------------------------------------------------

class TestLoginEndpoint:
    def test_returns_auth_url(self, client):
        response = client.get("/v1/auth/login")
        assert response.status_code == 200
        body = response.json()
        assert "auth_url" in body
        assert "accounts.spotify.com" in body["auth_url"]

    def test_auth_url_contains_pkce_params(self, client):
        response = client.get("/v1/auth/login")
        url = response.json()["auth_url"]
        assert "code_challenge=" in url
        assert "code_challenge_method=S256" in url
        assert "state=" in url

    def test_auth_url_contains_redirect_uri(self, client):
        response = client.get("/v1/auth/login")
        url = response.json()["auth_url"]
        assert "redirect_uri=" in url

    def test_creates_pkce_session_in_db(self, client, db_session):
        client.get("/v1/auth/login")
        sessions = db_session.query(PKCESession).all()
        assert len(sessions) == 1
        assert sessions[0].verifier is not None


# ---------------------------------------------------------------------------
# Integration — GET /v1/auth/callback (invalid state)
# ---------------------------------------------------------------------------

class TestCallbackEndpoint:
    def test_invalid_state_returns_404(self, client):
        response = client.get(
            "/v1/auth/callback",
            params={"code": "any_code", "state": "nonexistent_state"},
            follow_redirects=False,
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Integration — Auth guard (BE-09)
# ---------------------------------------------------------------------------

class TestAuthGuard:
    PROTECTED_ENDPOINTS = [
        ("GET", "/v1/profile/me"),
        ("POST", "/v1/etl/run"),
        ("GET", "/v1/etl/status"),
        ("GET", "/v1/artists/top"),
        ("GET", "/v1/tracks/top"),
        ("GET", "/v1/history/recently-played"),
    ]

    @pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
    def test_no_token_returns_401(self, client, method, path):
        response = getattr(client, method.lower())(path)
        assert response.status_code == 401

    @pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
    def test_malformed_token_returns_401(self, client, method, path):
        headers = {"Authorization": "Bearer not_a_valid_jwt"}
        response = getattr(client, method.lower())(path, headers=headers)
        assert response.status_code == 401

    @pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
    def test_missing_bearer_prefix_returns_401(self, client, method, path):
        headers = {"Authorization": "Token some_token"}
        response = getattr(client, method.lower())(path, headers=headers)
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Integration — GET /v1/profile/me
# ---------------------------------------------------------------------------

class TestProfileEndpoint:
    def test_authenticated_returns_200(self, client, auth_headers, sample_user):
        response = client.get("/v1/profile/me", headers=auth_headers)
        assert response.status_code == 200
        body = response.json()
        assert body["spotify_id"] == sample_user.spotify_id
        assert body["display_name"] == sample_user.display_name
