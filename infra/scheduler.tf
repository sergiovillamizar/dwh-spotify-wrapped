/**
 * scheduler.tf
 * Cloud Scheduler job for nightly incremental ETL.
 *
 * Design:
 *   - sa-etl-scheduler invokes POST /v1/etl/run-batch on the backend via the LB.
 *   - Requests carry a Google-signed OIDC token; the FastAPI app verifies it.
 *   - Retries up to 3× with exponential back-off before alerting.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Didier / Sergio
 * Updated:  2026-05-15
 */

# ---------------------------------------------------------------------------
# API activation (idempotent; already enabled manually on 2026-05-15)
# ---------------------------------------------------------------------------
resource "google_project_service" "cloudscheduler" {
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
  project            = var.project_id
}

# ---------------------------------------------------------------------------
# Service Account — ETL Scheduler
# ---------------------------------------------------------------------------
resource "google_service_account" "sa_scheduler" {
  account_id   = "sa-etl-scheduler"
  display_name = "ETL Nightly Scheduler SA"
  description  = "Used by Cloud Scheduler to invoke POST /v1/etl/run-batch with OIDC"
  project      = var.project_id
}

# Allow the scheduler SA to invoke the Cloud Run backend service
resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  project  = var.project_id
  location = var.region
  name     = var.cloud_run_backend_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.sa_scheduler.email}"
}

# ---------------------------------------------------------------------------
# Nightly ETL Cloud Scheduler Job
# ---------------------------------------------------------------------------
resource "google_cloud_scheduler_job" "etl_nightly" {
  name        = "etl-nightly"
  description = "Ingesta incremental diaria — ejecuta ETL para todos los usuarios Spotify registrados"
  project     = var.project_id
  region      = var.region

  # Run at 02:00 COT (America/Bogota, UTC-5) every day
  schedule  = var.scheduler_cron
  time_zone = var.scheduler_timezone

  # Cloud Run cold-start + ETL duration ceiling
  attempt_deadline = "600s"

  http_target {
    http_method = "POST"
    # Calls the backend via the Load Balancer (Cloud Run ingress = internal+LB only)
    uri = "https://${var.lb_domain}/v1/etl/run-batch"

    headers = {
      "Content-Type" = "application/json"
    }

    # Empty body — the endpoint derives the user list from the DB
    body = base64encode("{}")

    # Google-signed OIDC token; FastAPI verifies email == sa-etl-scheduler
    oidc_token {
      service_account_email = google_service_account.sa_scheduler.email
      # Audience must match what the backend verifies (LB base URL)
      audience = "https://${var.lb_domain}"
    }
  }

  retry_config {
    retry_count          = 3
    min_backoff_duration = "60s"
    max_backoff_duration = "3600s"
    max_doublings        = 3
  }

  depends_on = [google_project_service.cloudscheduler]
}
