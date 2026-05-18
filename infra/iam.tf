/**
 * iam.tf
 * Service accounts and minimal IAM bindings for Cloud Run services,
 * Cloud Build, and the existing infrastructure service account.
 *
 * Principle of least privilege: each SA receives only the roles it needs.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

# ---------------------------------------------------------------------------
# Service Account — Cloud Run Backend (FastAPI)
# ---------------------------------------------------------------------------
resource "google_service_account" "sa_cloudrun_backend" {
  account_id   = "sa-cloudrun-backend"
  display_name = "Cloud Run Backend SA"
  description  = "Used by the FastAPI Cloud Run service to access Cloud SQL, Secret Manager, and Cloud Logging"
  project      = var.project_id
}

# Allow backend SA to access Cloud SQL via IAM auth
resource "google_project_iam_member" "backend_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_cloudrun_backend.email}"
}

# Allow backend SA to read secrets
resource "google_project_iam_member" "backend_secretmanager_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.sa_cloudrun_backend.email}"
}

# Allow backend SA to write logs
resource "google_project_iam_member" "backend_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.sa_cloudrun_backend.email}"
}

# Allow backend SA to write metrics
resource "google_project_iam_member" "backend_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.sa_cloudrun_backend.email}"
}

# ---------------------------------------------------------------------------
# Service Account — Cloud Run Frontend (Next.js SSR)
# ---------------------------------------------------------------------------
resource "google_service_account" "sa_cloudrun_frontend" {
  account_id   = "sa-cloudrun-frontend"
  display_name = "Cloud Run Frontend SA"
  description  = "Used by the Next.js Cloud Run service to read secrets and write logs"
  project      = var.project_id
}

# Allow frontend SA to read secrets (e.g. Spotify client ID for SSR)
resource "google_project_iam_member" "frontend_secretmanager_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.sa_cloudrun_frontend.email}"
}

# Allow frontend SA to write logs
resource "google_project_iam_member" "frontend_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.sa_cloudrun_frontend.email}"
}

# Allow frontend SA to write metrics
resource "google_project_iam_member" "frontend_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.sa_cloudrun_frontend.email}"
}

# Allow frontend SA to read static assets bucket (for server-side operations if needed)
resource "google_storage_bucket_iam_member" "frontend_bucket_reader" {
  bucket = google_storage_bucket.static_assets.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.sa_cloudrun_frontend.email}"
}

# ---------------------------------------------------------------------------
# Service Account — Cloud Build CI/CD
# Recurso existente — creado manualmente vía gcloud 2026-05-14
# terraform import google_service_account.sa_cloudbuild projects/dwh-spotify-wrapped/serviceAccounts/sa-cloudbuild@dwh-spotify-wrapped.iam.gserviceaccount.com
# ---------------------------------------------------------------------------
resource "google_service_account" "sa_cloudbuild" {
  account_id   = "sa-cloudbuild"
  display_name = "Cloud Build CI/CD SA"
  description  = "Used by Cloud Build to deploy Cloud Run services, push images, and write to GCS"
  project      = var.project_id
}

# Allow Cloud Build SA to push container images to Artifact Registry / GCR
resource "google_project_iam_member" "cloudbuild_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.sa_cloudbuild.email}"
}

# Allow Cloud Build SA to deploy Cloud Run services
resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.sa_cloudbuild.email}"
}

# Allow Cloud Build SA to act as the Cloud Run SAs when deploying
resource "google_service_account_iam_member" "cloudbuild_act_as_backend" {
  service_account_id = google_service_account.sa_cloudrun_backend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.sa_cloudbuild.email}"
}

resource "google_service_account_iam_member" "cloudbuild_act_as_frontend" {
  service_account_id = google_service_account.sa_cloudrun_frontend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.sa_cloudbuild.email}"
}

# Allow Cloud Build SA to write logs
resource "google_project_iam_member" "cloudbuild_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.sa_cloudbuild.email}"
}

# ---------------------------------------------------------------------------
# Service Account — Colab EDA (read-only access to Cloud SQL)
# Created manually via gcloud 2026-05-18 then imported here.
# terraform import google_service_account.sa_colab_eda projects/dwh-spotify-wrapped/serviceAccounts/sa-colab-eda@dwh-spotify-wrapped.iam.gserviceaccount.com
# ---------------------------------------------------------------------------
resource "google_service_account" "sa_colab_eda" {
  account_id   = "sa-colab-eda"
  display_name = "Colab EDA Read-Only"
  description  = "Used by Google Colab notebooks to connect to Cloud SQL via Cloud SQL Python Connector. Read-only for EDA."
  project      = var.project_id
}

# Allow Colab SA to connect to Cloud SQL instances (mTLS via Connector)
resource "google_project_iam_member" "colab_eda_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.sa_colab_eda.email}"
}

# ---------------------------------------------------------------------------
# Existing infra SA — spotify-infra (created manually by Sergio)
# Recurso existente:
# terraform import google_service_account.sa_infra projects/dwh-spotify-wrapped/serviceAccounts/spotify-infra@dwh-spotify-wrapped.iam.gserviceaccount.com
# ---------------------------------------------------------------------------
resource "google_service_account" "sa_infra" {
  account_id   = "spotify-infra"
  display_name = "Spotify Infrastructure SA"
  description  = "Legacy infra SA created manually — roles/editor assigned via GCP console"
  project      = var.project_id

  lifecycle {
    prevent_destroy = true
  }
}
