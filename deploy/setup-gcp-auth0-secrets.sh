#!/usr/bin/env bash
# Create or update Auth0 secrets in Secret Manager for consent-management-admin.
#
# Usage (from project root):
#   export AUTH0_CLIENT_SECRET=...
#   export AUTH0_SECRET=...   # or omit to generate
#   ./deploy/setup-gcp-auth0-secrets.sh
#
# Or source values from .env / ../varnarc_web/project/.env

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="myweb-503314"
REGION="us-central1"
SERVICE="consent-management-admin"
ADMIN_URL="https://consent-management-admin-414895350436.us-central1.run.app"
API_URL="https://consent-management-api-414895350436.us-central1.run.app"

for ENV_FILE in "$ROOT/.env" "$ROOT/../../varnarc_web/project/.env"; do
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
done

: "${AUTH0_DOMAIN:?AUTH0_DOMAIN is required}"
: "${AUTH0_CLIENT_ID:?AUTH0_CLIENT_ID is required}"
: "${AUTH0_CLIENT_SECRET:?AUTH0_CLIENT_SECRET is required}"
AUTH0_SECRET="${AUTH0_SECRET:-$(openssl rand -hex 32)}"

gcloud config set project "$PROJECT_ID"

create_or_update_secret() {
  local name="$1"
  local value="$2"
  if gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=-
  fi
}

create_or_update_secret "AUTH0_CLIENT_SECRET" "$AUTH0_CLIENT_SECRET"
create_or_update_secret "AUTH0_SECRET" "$AUTH0_SECRET"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in AUTH0_CLIENT_SECRET AUTH0_SECRET; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done

echo "Updating Cloud Run service: $SERVICE"
gcloud run services update "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,APP_BASE_URL=${ADMIN_URL},AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID},NEXT_PUBLIC_AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-},NEXT_PUBLIC_AUTH0_CONFIGURED=true" \
  --set-secrets="AUTH0_CLIENT_SECRET=AUTH0_CLIENT_SECRET:latest,AUTH0_SECRET=AUTH0_SECRET:latest"

echo "Updating API Auth0 env vars"
gcloud run services update consent-management-api \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --update-env-vars="AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID},AUTH0_ISSUER_URL=https://${AUTH0_DOMAIN}/,AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-},API_URL=${API_URL},ADMIN_URL=${ADMIN_URL}"

echo ""
echo "Done. Add Auth0 callback URL if not already set:"
echo "  ${ADMIN_URL}/auth/callback"
