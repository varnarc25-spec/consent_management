#!/usr/bin/env sh
set -eu

# Run Prisma migrations against Cloud SQL (used by Cloud Run Job).
# Requires DATABASE_URL secret mounted as env var.

SCHEMA="packages/database/prisma/schema.prisma"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

echo "Running prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy --schema="$SCHEMA"
echo "Migrations complete."
