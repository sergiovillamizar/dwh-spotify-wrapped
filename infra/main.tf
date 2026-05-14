/**
 * main.tf
 * Provider configuration and GCS backend for Terraform state.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio (infrastructure) / Didier (data engineering)
 * Updated:  2026-05-14
 */

terraform {
  backend "gcs" {
    bucket = "spotify-wrapped-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
