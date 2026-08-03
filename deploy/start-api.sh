#!/bin/sh
set -e

echo "[cmp-api] Starting (PORT=${PORT:-8080})"

missing=""
for name in JWT_ACCESS_SECRET JWT_REFRESH_SECRET CM_DATABASE_URL; do
  eval "val=\${$name}"
  if [ -z "$val" ]; then
    missing="${missing} ${name}"
  fi
done

if [ -n "$missing" ]; then
  echo "[cmp-api] ERROR: Missing required secrets/env:$missing" >&2
  echo "[cmp-api] Ensure Cloud Run --set-secrets includes CM_DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET" >&2
  exit 1
fi

exec node dist/main.js
