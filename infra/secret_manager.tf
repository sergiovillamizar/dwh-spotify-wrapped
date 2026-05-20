/**
 * secret_manager.tf
 * Secret Manager secrets (placeholder versions — real values set via CI/CD or
 * `gcloud secrets versions add` — NEVER stored in Terraform state).
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

# ---------------------------------------------------------------------------
# Spotify Client Secret
# Set real value with:
#   echo -n "<secret>" | gcloud secrets versions add spotify-client-secret --data-file=-
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "spotify_client_secret" {
  secret_id = "spotify-client-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ---------------------------------------------------------------------------
# Database Password
# Managed by Terraform: random_password (cloud_sql.tf) generates the value,
# google_secret_manager_secret_version pushes it here so Cloud Run can read
# it via version "latest".  After terraform apply, deploy a new Cloud Run
# revision to pick up the new version.
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# ---------------------------------------------------------------------------
# JWT Secret
# Set real value with:
#   openssl rand -hex 32 | gcloud secrets versions add jwt-secret --data-file=-
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ---------------------------------------------------------------------------
# Spotify Client ID (public but convenient to store here)
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "spotify_client_id" {
  secret_id = "spotify-client-id"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ---------------------------------------------------------------------------
# Last.fm API Key
# Set real value with:
#   echo -n "<api_key>" | gcloud secrets versions add lastfm-api-key --data-file=-
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "lastfm_api_key" {
  secret_id = "lastfm-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ---------------------------------------------------------------------------
# Last.fm Shared Secret
# Set real value with:
#   echo -n "<shared_secret>" | gcloud secrets versions add lastfm-shared-secret --data-file=-
# ---------------------------------------------------------------------------
resource "google_secret_manager_secret" "lastfm_shared_secret" {
  secret_id = "lastfm-shared-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
