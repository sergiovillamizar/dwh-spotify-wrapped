/**
 * load_balancer.tf
 * External HTTPS Global Load Balancer with:
 *  - Static global IP (already reserved as lb-global-ip)
 *  - Managed SSL certificate
 *  - URL map routing:
 *      /_next/static/*  → backend bucket (GCS static assets)
 *      /v1/*            → backend service (Cloud Run backend)
 *      /*               → backend service (Cloud Run frontend, default)
 *  - CDN configuration is in cdn.tf
 *
 * Static IP is imported as a data source — it already exists.
 * Recurso existente (IP): terraform import data source — no import needed.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

# ---------------------------------------------------------------------------
# Data source — existing static global IP reserved as lb-global-ip
# ---------------------------------------------------------------------------
data "google_compute_global_address" "lb_ip" {
  name    = "lb-global-ip"
  project = var.project_id
}

# ---------------------------------------------------------------------------
# Managed SSL Certificate
# Update var.lb_domain when the real domain is registered.
# ---------------------------------------------------------------------------
resource "google_compute_managed_ssl_certificate" "lb_cert" {
  name    = "lb-managed-cert"
  project = var.project_id

  managed {
    domains = ["${var.lb_domain}"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ---------------------------------------------------------------------------
# Backend Bucket — GCS static assets (/_next/static/*)
# CDN settings live in cdn.tf via the enable_cdn attribute here
# ---------------------------------------------------------------------------
resource "google_compute_backend_bucket" "static_assets" {
  name        = "lb-backend-bucket-static"
  project     = var.project_id
  bucket_name = google_storage_bucket.static_assets.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    serve_while_stale = 86400

    cache_key_policy {
      include_http_headers       = []
      query_string_whitelist     = []
    }
  }

  description = "Serves Next.js static assets from GCS with CDN caching"
}

# ---------------------------------------------------------------------------
# Network Endpoint Group (Serverless NEG) — Cloud Run Backend
# ---------------------------------------------------------------------------
resource "google_compute_region_network_endpoint_group" "backend_neg" {
  name                  = "neg-cloud-run-backend"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

# ---------------------------------------------------------------------------
# Network Endpoint Group (Serverless NEG) — Cloud Run Frontend
# ---------------------------------------------------------------------------
resource "google_compute_region_network_endpoint_group" "frontend_neg" {
  name                  = "neg-cloud-run-frontend"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.frontend.name
  }
}

# ---------------------------------------------------------------------------
# Backend Service — Cloud Run Backend (/v1/*)
# CDN disabled for API endpoints.
# ---------------------------------------------------------------------------
resource "google_compute_backend_service" "backend_api" {
  name                  = "lb-backend-service-api"
  project               = var.project_id
  protocol              = "HTTPS"
  port_name             = "https"
  timeout_sec           = 30
  enable_cdn            = false
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.backend_neg.id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }

  description = "Cloud Run FastAPI backend — no CDN caching"
}

# ---------------------------------------------------------------------------
# Backend Service — Cloud Run Frontend (default /*)
# CDN enabled with USE_ORIGIN_HEADERS to respect Next.js cache directives.
# ---------------------------------------------------------------------------
resource "google_compute_backend_service" "frontend_ssr" {
  name                  = "lb-backend-service-frontend"
  project               = var.project_id
  protocol              = "HTTPS"
  port_name             = "https"
  timeout_sec           = 30
  enable_cdn            = true
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.frontend_neg.id
  }

  cdn_policy {
    cache_mode                   = "USE_ORIGIN_HEADERS"
    signed_url_key_names         = []
    serve_while_stale            = 60
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = true
    }
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }

  description = "Cloud Run Next.js SSR frontend — CDN respects origin Cache-Control headers"
}

# ---------------------------------------------------------------------------
# URL Map
# Routes:
#   /_next/static/*  → backend bucket (GCS)
#   /v1/*            → backend service (FastAPI)
#   /*               → backend service (Next.js SSR) — default
# ---------------------------------------------------------------------------
resource "google_compute_url_map" "lb_url_map" {
  name            = "lb-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.frontend_ssr.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_service.frontend_ssr.id

    path_rule {
      paths   = ["/_next/static", "/_next/static/*"]
      service = google_compute_backend_bucket.static_assets.id
    }

    path_rule {
      paths   = ["/v1", "/v1/*"]
      service = google_compute_backend_service.backend_api.id
    }
  }
}

# ---------------------------------------------------------------------------
# HTTPS Target Proxy
# ---------------------------------------------------------------------------
resource "google_compute_target_https_proxy" "lb_https_proxy" {
  name             = "lb-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.lb_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.lb_cert.id]
}

# ---------------------------------------------------------------------------
# HTTP Target Proxy (redirect HTTP → HTTPS)
# ---------------------------------------------------------------------------
resource "google_compute_url_map" "http_redirect" {
  name    = "lb-http-redirect"
  project = var.project_id

  default_url_redirect {
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    https_redirect         = true
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "lb_http_proxy" {
  name    = "lb-http-proxy"
  project = var.project_id
  url_map = google_compute_url_map.http_redirect.id
}

# ---------------------------------------------------------------------------
# Global Forwarding Rule — HTTPS (port 443)
# ---------------------------------------------------------------------------
resource "google_compute_global_forwarding_rule" "https" {
  name                  = "lb-forwarding-rule-https"
  project               = var.project_id
  ip_address            = data.google_compute_global_address.lb_ip.address
  ip_protocol           = "TCP"
  port_range            = "443"
  target                = google_compute_target_https_proxy.lb_https_proxy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"

  description = "HTTPS entry point for the External Global Load Balancer"
}

# ---------------------------------------------------------------------------
# Global Forwarding Rule — HTTP (port 80) → redirects to HTTPS
# ---------------------------------------------------------------------------
resource "google_compute_global_forwarding_rule" "http" {
  name                  = "lb-forwarding-rule-http"
  project               = var.project_id
  ip_address            = data.google_compute_global_address.lb_ip.address
  ip_protocol           = "TCP"
  port_range            = "80"
  target                = google_compute_target_http_proxy.lb_http_proxy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"

  description = "HTTP entry point — redirects all traffic to HTTPS"
}
