/**
 * cloud_build_triggers.tf
 * Cloud Build 2nd-gen triggers connected to GitHub via the
 * github-sergiovillamizar host connection (us-central1).
 *
 * Both triggers fire on push/merge to `main` and use sa-cloudbuild
 * as their execution identity (least-privilege, not the default CB SA).
 *
 * Resources created manually on 2026-05-14 via REST API (gcloud CLI
 * does not support 2nd-gen connection triggers).  Import with:
 *   terraform import google_cloudbuild_trigger.backend_deploy  projects/dwh-spotify-wrapped/locations/us-central1/triggers/68ecf823-980c-49fb-9e26-1300b60a75de
 *   terraform import google_cloudbuild_trigger.frontend_deploy projects/dwh-spotify-wrapped/locations/us-central1/triggers/24bfe03e-7073-463e-baf6-8309dbeaa556
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Didier
 * Updated:  2026-05-14
 */

# ---------------------------------------------------------------------------
# Local — 2nd-gen repository resource name (shared by both triggers)
# ---------------------------------------------------------------------------
locals {
  cb_repository = "projects/${var.project_id}/locations/${var.region}/connections/github-sergiovillamizar/repositories/sergiovillamizar-dwh-spotify-wrapped"
}

# ---------------------------------------------------------------------------
# Trigger — Backend (FastAPI)
# Fires when any file under backend/** changes on main.
# ---------------------------------------------------------------------------
resource "google_cloudbuild_trigger" "backend_deploy" {
  name        = "backend-deploy-on-main"
  description = "Deploy backend to Cloud Run on merge to main"
  location    = var.region
  project     = var.project_id

  repository_event_config {
    repository = local.cb_repository

    push {
      branch = "main"
    }
  }

  filename       = "cloudbuild-backend.yaml"
  included_files = ["backend/**"]

  service_account = google_service_account.sa_cloudbuild.id

  depends_on = [google_service_account.sa_cloudbuild]
}

# ---------------------------------------------------------------------------
# Trigger — Frontend (Next.js)
# Fires when any file under frontend/** changes on main.
# ---------------------------------------------------------------------------
resource "google_cloudbuild_trigger" "frontend_deploy" {
  name        = "frontend-deploy-on-main"
  description = "Deploy frontend to Cloud Run on merge to main"
  location    = var.region
  project     = var.project_id

  repository_event_config {
    repository = local.cb_repository

    push {
      branch = "main"
    }
  }

  filename       = "cloudbuild-frontend.yaml"
  included_files = ["frontend/**"]

  service_account = google_service_account.sa_cloudbuild.id

  depends_on = [google_service_account.sa_cloudbuild]
}
