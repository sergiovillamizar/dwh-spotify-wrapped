#!/bin/bash
set -e
if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: DB_PASSWORD secret not mounted" >&2
  exit 1
fi
INSTANCE="${CLOUD_SQL_INSTANCE:-dwh-spotify-wrapped:us-central1:spotify-postgres}"
export DATABASE_URL="postgresql+psycopg2://postgres:${DB_PASSWORD}@/postgres?host=/cloudsql/${INSTANCE}"
exec python -m app.scripts.inspect_artists
