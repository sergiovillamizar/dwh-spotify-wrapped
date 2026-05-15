/**
 * variables.tf
 * All input variables with default values for dwh-spotify-wrapped.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "dwh-spotify-wrapped"
}

variable "region" {
  description = "GCP region for all regional resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for zonal resources (Cloud SQL)"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Deployment environment (dev / staging / prod)"
  type        = string
  default     = "prod"
}

variable "db_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "spotify-postgres"
}

variable "db_version" {
  description = "Cloud SQL PostgreSQL version"
  type        = string
  default     = "POSTGRES_16"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-custom-1-3840"
}

variable "db_disk_size_gb" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 10
}

variable "vpc_name" {
  description = "Name of the VPC network"
  type        = string
  default     = "spotify-wrapped-vpc"
}

variable "subnet_private_db_name" {
  description = "Name of the private DB subnet"
  type        = string
  default     = "private-db"
}

variable "subnet_private_db_cidr" {
  description = "CIDR for the private DB subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "subnet_serverless_name" {
  description = "Name of the serverless connector subnet"
  type        = string
  default     = "serverless-conn"
}

variable "subnet_serverless_cidr" {
  description = "CIDR for the serverless connector subnet"
  type        = string
  default     = "10.8.0.0/28"
}

variable "vpc_connector_name" {
  description = "Name of the Serverless VPC Connector"
  type        = string
  default     = "spotify-vpc-connector"
}

variable "static_bucket_name" {
  description = "GCS bucket for Next.js static assets"
  type        = string
  default     = "spotify-wrapped-static"
}

variable "lb_domain" {
  description = "Domain for the managed SSL certificate. Using nip.io wildcard DNS for PoC (34-54-8-28.nip.io resolves automatically to 34.54.8.28). Replace with real domain when registered."
  type        = string
  default     = "34-54-8-28.nip.io"
}

variable "cloud_run_backend_name" {
  description = "Cloud Run service name for the FastAPI backend"
  type        = string
  default     = "spotify-backend"
}

variable "cloud_run_frontend_name" {
  description = "Cloud Run service name for the Next.js frontend"
  type        = string
  default     = "spotify-frontend"
}

variable "cloud_run_backend_image" {
  description = "Container image for the FastAPI backend (managed by Cloud Build)"
  type        = string
  # Artifact Registry path — updated by Cloud Build on every deploy
  default     = "us-central1-docker.pkg.dev/dwh-spotify-wrapped/spotify-wrapped/backend:latest"
}

variable "cloud_run_frontend_image" {
  description = "Container image for the Next.js frontend (managed by Cloud Build)"
  type        = string
  # Placeholder until first frontend build; Cloud Build will update this image
  default     = "us-docker.pkg.dev/cloudrun/container/hello:latest"
}

# ---------------------------------------------------------------------------
# Cloud Scheduler — nightly ETL
# ---------------------------------------------------------------------------
variable "scheduler_cron" {
  description = "Cron expression for the nightly ETL job (Cloud Scheduler syntax)"
  type        = string
  default     = "0 2 * * *" # 02:00 in scheduler_timezone
}

variable "scheduler_timezone" {
  description = "IANA timezone for the nightly ETL scheduler job"
  type        = string
  default     = "America/Bogota" # COT = UTC-5, no DST
}
