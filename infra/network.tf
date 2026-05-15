/**
 * network.tf
 * VPC, subnets, Cloud NAT, router, firewall rules, VPC Connector,
 * and Private Service Connection for Cloud SQL.
 *
 * Existing resources (created manually by Sergio) are marked with
 * lifecycle.prevent_destroy and include import instructions.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

# ---------------------------------------------------------------------------
# VPC Network
# Recurso existente — creado manualmente por Sergio
# terraform import google_compute_network.vpc projects/dwh-spotify-wrapped/global/networks/spotify-wrapped-vpc
# ---------------------------------------------------------------------------
resource "google_compute_network" "vpc" {
  name                    = var.vpc_name
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  project                 = var.project_id

  lifecycle {
    prevent_destroy = true
  }
}

# ---------------------------------------------------------------------------
# Subnet — private DB tier
# Recurso existente — creado manualmente por Sergio
# terraform import google_compute_subnetwork.private_db projects/dwh-spotify-wrapped/regions/us-central1/subnetworks/private-db
# ---------------------------------------------------------------------------
resource "google_compute_subnetwork" "private_db" {
  name                     = var.subnet_private_db_name
  ip_cidr_range            = var.subnet_private_db_cidr
  region                   = var.region
  network                  = google_compute_network.vpc.id
  project                  = var.project_id
  private_ip_google_access = false

  lifecycle {
    prevent_destroy = true
  }
}

# ---------------------------------------------------------------------------
# Subnet — Serverless VPC Connector
# Recurso existente — creado manualmente por Sergio
# terraform import google_compute_subnetwork.serverless_conn projects/dwh-spotify-wrapped/regions/us-central1/subnetworks/serverless-conn
# ---------------------------------------------------------------------------
resource "google_compute_subnetwork" "serverless_conn" {
  name          = var.subnet_serverless_name
  ip_cidr_range = var.subnet_serverless_cidr
  region        = var.region
  network       = google_compute_network.vpc.id
  project       = var.project_id

  lifecycle {
    prevent_destroy = true
  }
}

# ---------------------------------------------------------------------------
# Cloud Router (required for Cloud NAT)
# ---------------------------------------------------------------------------
resource "google_compute_router" "nat_router" {
  name    = "spotify-nat-router"
  region  = var.region
  network = google_compute_network.vpc.id
  project = var.project_id
}

# ---------------------------------------------------------------------------
# Cloud NAT — provides egress from Cloud Run to Spotify API
# ---------------------------------------------------------------------------
resource "google_compute_router_nat" "nat" {
  name                               = "spotify-cloud-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  project                            = var.project_id
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ---------------------------------------------------------------------------
# Firewall — allow internal traffic within the VPC
# ---------------------------------------------------------------------------
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  network = google_compute_network.vpc.name
  project = var.project_id

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
  }
  allow {
    protocol = "udp"
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/8"]

  description = "Allow all internal traffic within the VPC CIDR space"
}

# ---------------------------------------------------------------------------
# Firewall — allow health-check probes from Google LB ranges
# ---------------------------------------------------------------------------
resource "google_compute_firewall" "allow_health_checks" {
  name    = "allow-health-checks"
  network = google_compute_network.vpc.name
  project = var.project_id

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080"]
  }

  # Google health check source ranges
  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]

  description = "Allow Google LB health-check probes"
}

# ---------------------------------------------------------------------------
# Firewall — deny all ingress by default (explicit deny-all)
# ---------------------------------------------------------------------------
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "deny-all-ingress"
  network = google_compute_network.vpc.name
  project = var.project_id

  direction = "INGRESS"
  priority  = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]

  description = "Deny all ingress traffic — explicit default deny"
}

# ---------------------------------------------------------------------------
# Serverless VPC Connector
# Allows Cloud Run services to reach Cloud SQL on the private subnet.
# Uses the dedicated serverless-conn subnet (10.8.0.0/28).
# ---------------------------------------------------------------------------
resource "google_vpc_access_connector" "connector" {
  provider      = google-beta
  name          = var.vpc_connector_name
  region        = var.region
  project       = var.project_id
  min_instances = 2
  max_instances = 3

  # Use subnet-based connector — avoids CIDR conflict with the existing
  # serverless-conn subnet (10.8.0.0/28). The subnet was pre-created by Sergio.
  subnet {
    name       = google_compute_subnetwork.serverless_conn.name
    project_id = var.project_id
  }

  depends_on = [google_compute_subnetwork.serverless_conn]
}

# ---------------------------------------------------------------------------
# Private Service Connection — required for Cloud SQL private IP
# Allocates a /16 range for Google-managed peering services.
# ---------------------------------------------------------------------------
resource "google_compute_global_address" "private_service_range" {
  name          = "private-ip-alloc"  # existing GCP resource name created by Sergio
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]

  depends_on = [google_compute_global_address.private_service_range]
}
