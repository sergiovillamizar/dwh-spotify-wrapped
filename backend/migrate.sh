#!/bin/bash
# migrate.sh — Alembic migration entrypoint for Cloud Run Job.
# DB_PASSWORD is injected by Cloud Run Secrets; CLOUD_SQL_INSTANCE is set as env var.
set -e

if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: DB_PASSWORD secret not mounted" >&2
  exit 1
fi

INSTANCE="${CLOUD_SQL_INSTANCE:-dwh-spotify-wrapped:us-central1:spotify-postgres}"
export DATABASE_URL="postgresql+psycopg2://postgres:${DB_PASSWORD}@/postgres?host=/cloudsql/${INSTANCE}"

echo "[migrate] target: ${INSTANCE}"
exec alembic upgrade head
