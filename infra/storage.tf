/**
 * storage.tf
 * GCS bucket for Next.js static assets served via the CDN-backed Load Balancer.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

resource "google_storage_bucket" "static_assets" {
  name                        = var.static_bucket_name
  location                    = "US"
  project                     = var.project_id
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  # Public read is required for CDN-served static assets
  # Access is controlled at the LB level; the bucket itself must be readable.
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }

  versioning {
    enabled = false
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }
}

# Allow public read for objects in the static assets bucket
resource "google_storage_bucket_iam_member" "static_public_read" {
  bucket = google_storage_bucket.static_assets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
