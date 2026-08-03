#!/usr/bin/env sh
set -eu

# Run Prisma migrations against Cloud SQL (used by Cloud Run Job).
# Requires CM_DATABASE_URL secret mounted as env var.

SCHEMA="packages/database/prisma/schema.prisma"

if [ -z "${CM_DATABASE_URL:-}" ]; then
  echo "ERROR: CM_DATABASE_URL is not set" >&2
  exit 1
fi

echo "Running prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy --schema="$SCHEMA"
echo "Migrations complete."
