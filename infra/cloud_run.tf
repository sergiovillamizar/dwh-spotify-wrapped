/**
 * cloud_run.tf
 * Cloud Run v2 services for FastAPI backend and Next.js frontend.
 *
 * Images are managed by Cloud Build; lifecycle ignore_changes prevents
 * Terraform from reverting the image on every `terraform apply`.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

# ---------------------------------------------------------------------------
# Cloud Run — FastAPI Backend
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "backend" {
  name     = var.cloud_run_backend_name
  location = var.region
  project  = var.project_id

  # Do not expose the Cloud Run URL publicly — traffic must go through the LB
  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.sa_cloudrun_backend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.cloud_run_backend_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      ports {
        container_port = 8000
      }

      # ── Secrets ──────────────────────────────────────────────────────────
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SPOTIFY_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.spotify_client_secret.secret_id
            version = "latest"
          }
        }
      }

      # config.py reads SECRET_KEY (not JWT_SECRET) for token signing
      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "LASTFM_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.lastfm_api_key.secret_id
            version = "latest"
          }
        }
      }

      # ── Plain env vars ────────────────────────────────────────────────────
      # config.py builds DATABASE_URL from DB_PASSWORD + CLOUD_SQL_INSTANCE
      env {
        name  = "CLOUD_SQL_INSTANCE"
        value = google_sql_database_instance.postgres.connection_name
      }

      env {
        name  = "SPOTIFY_CLIENT_ID"
        value = var.spotify_client_id
      }

      env {
        name  = "SPOTIFY_REDIRECT_URI"
        value = "https://${var.lb_domain}/v1/auth/callback"
      }

      env {
        name  = "FRONTEND_URL"
        value = "https://${var.lb_domain}"
      }

      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      # Cloud SQL Unix socket — required for psycopg2 ?host=/cloudsql/<instance>
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      startup_probe {
        http_get {
          path = "/v1/health"
          port = 8000
        }
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/v1/health"
          port = 8000
        }
        initial_delay_seconds = 15
        timeout_seconds       = 3
        period_seconds        = 30
        failure_threshold     = 3
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }
  }

  depends_on = [
    google_vpc_access_connector.connector,
    google_service_account.sa_cloudrun_backend,
    google_secret_manager_secret.db_password,
    google_secret_manager_secret.spotify_client_secret,
    google_secret_manager_secret.jwt_secret,
  ]

  lifecycle {
    # Cloud Build manages the image — prevent Terraform from reverting it
    ignore_changes = [
      template[0].containers[0].image,
      template[0].revision,
      client,
      client_version,
    ]
  }
}

# Allow LB / unauthenticated invocations from the Load Balancer
resource "google_cloud_run_v2_service_iam_member" "backend_public_invoke" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# Cloud Run — Next.js Frontend
# ---------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "frontend" {
  name     = var.cloud_run_frontend_name
  location = var.region
  project  = var.project_id

  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.sa_cloudrun_frontend.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.cloud_run_frontend_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 3000
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://${var.lb_domain}"
      }

      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      startup_probe {
        http_get {
          path = "/api/health"
          port = 3000
        }
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  depends_on = [
    google_vpc_access_connector.connector,
    google_service_account.sa_cloudrun_frontend,
  ]

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].revision,
      client,
      client_version,
    ]
  }
}

# Allow unauthenticated invocations from the Load Balancer
resource "google_cloud_run_v2_service_iam_member" "frontend_public_invoke" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
