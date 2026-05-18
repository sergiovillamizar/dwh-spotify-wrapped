/**
 * cloud_sql.tf
 * Cloud SQL for PostgreSQL 16 with private IP only.
 *
 * Recurso existente — creado manualmente por Sergio.
 * terraform import google_sql_database_instance.postgres dwh-spotify-wrapped/spotify-postgres
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

resource "google_sql_database_instance" "postgres" {
  name             = var.db_instance_name
  database_version = var.db_version
  region           = var.region
  project          = var.project_id

  # Prevent accidental deletion of the production database
  deletion_protection = true

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"
    disk_size         = var.db_disk_size_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = false

    location_preference {
      zone = var.zone
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "13:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = true   # public IP required for Colab / external EDA access via Cloud SQL Connector
      private_network = "projects/${var.project_id}/global/networks/${var.vpc_name}"
      # Cloud SQL Python Connector enforces IAM auth + mTLS — no raw password over internet
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = false
      record_client_address   = false
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]

  lifecycle {
    prevent_destroy = true
    # Ignore changes to the image/settings managed outside Terraform
    ignore_changes = [settings[0].disk_size]
  }
}
