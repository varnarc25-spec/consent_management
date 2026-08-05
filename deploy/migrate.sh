#!/usr/bin/env sh
set -eu

# Run Prisma migrations against Cloud SQL (used by Cloud Run Job).
# Requires CM_DATABASE_URL secret mounted as env var.

if [ -z "${CM_DATABASE_URL:-}" ]; then
  echo "ERROR: CM_DATABASE_URL is not set" >&2
  exit 1
fi

SCHEMA="${CMP_PRISMA_SCHEMA:-}"
if [ -z "$SCHEMA" ]; then
  SCHEMA="$(find . -path '*/@cmp/database/prisma/schema.prisma' -print -quit 2>/dev/null || true)"
fi
if [ -z "$SCHEMA" ] && [ -f "packages/database/prisma/schema.prisma" ]; then
  SCHEMA="packages/database/prisma/schema.prisma"
fi
if [ -z "$SCHEMA" ]; then
  echo "ERROR: Could not locate Prisma schema" >&2
  exit 1
fi

echo "Using schema: $SCHEMA"

echo "Running prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy --schema="$SCHEMA"
echo "Migrations complete."

if [ "${CMP_RUN_SEED:-true}" = "true" ]; then
  echo "Running database seed..."
  SEED_SCRIPT="$(find . -path '*/@cmp/database/dist/seed.js' -print -quit 2>/dev/null || true)"
  if [ -n "$SEED_SCRIPT" ] && [ -f "$SEED_SCRIPT" ]; then
    node "$SEED_SCRIPT"
  else
    echo "WARN: Seed script not found — run pnpm db:seed locally" >&2
  fi
fi
