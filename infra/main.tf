resource "google_compute_network" "spotify_vpc" {
  name                    = "spotify-wrapped-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "private_db" {
  name          = "private-db"
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-central1"
  network       = google_compute_network.spotify_vpc.id
}

resource "google_compute_subnetwork" "serverless_conn" {
  name          = "serverless-conn"
  ip_cidr_range = "10.8.0.0/28"
  region        = "us-central1"
  network       = google_compute_network.spotify_vpc.id
}

resource "google_compute_global_address" "private_ip_alloc" {
  name          = "private-ip-alloc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.spotify_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.spotify_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}

resource "google_sql_database_instance" "postgres" {
  name             = "spotify-postgres"
  region           = "us-central1"
  database_version = "POSTGRES_16"

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-custom-1-3840"

    backup_configuration {
      enabled = true
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.spotify_vpc.id
    }
  }

  deletion_protection = false
}
