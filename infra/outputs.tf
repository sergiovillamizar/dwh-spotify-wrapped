/**
 * outputs.tf
 * Key outputs consumed by application deployment pipelines.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

output "lb_ip_address" {
  description = "Global static IP address of the External HTTPS Load Balancer"
  value       = data.google_compute_global_address.lb_ip.address
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name (project:region:instance)"
  value       = google_sql_database_instance.postgres.connection_name
}

output "static_bucket_name" {
  description = "Name of the GCS bucket serving Next.js static assets"
  value       = google_storage_bucket.static_assets.name
}

output "static_bucket_url" {
  description = "gs:// URL of the static assets bucket"
  value       = google_storage_bucket.static_assets.url
}

output "vpc_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "vpc_connector_id" {
  description = "Fully qualified ID of the Serverless VPC Connector"
  value       = google_vpc_access_connector.connector.id
}

output "cloud_run_backend_url" {
  description = "URL of the Cloud Run backend service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "cloud_run_frontend_url" {
  description = "URL of the Cloud Run frontend service"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "scheduler_sa_email" {
  description = "Email of the Cloud Scheduler service account (used for OIDC verification in FastAPI)"
  value       = google_service_account.sa_scheduler.email
}

output "etl_scheduler_job_name" {
  description = "Fully qualified name of the nightly ETL Cloud Scheduler job"
  value       = google_cloud_scheduler_job.etl_nightly.name
}
