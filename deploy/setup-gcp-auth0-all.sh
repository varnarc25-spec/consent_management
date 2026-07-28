#!/usr/bin/env bash
# Configure Auth0 on consent-management API, admin, and web Cloud Run services.
#
# Usage (from project root):
#   ./deploy/setup-gcp-auth0-all.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="myweb-503314"
REGION="us-central1"
WEB_URL="https://consent-management-web-414895350436.us-central1.run.app"
ADMIN_URL="https://consent-management-admin-414895350436.us-central1.run.app"
API_URL="https://consent-management-api-414895350436.us-central1.run.app/api/v1"

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
: "${AUTH0_AUDIENCE:?AUTH0_AUDIENCE is required}"
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

COMMON_API_ENV="AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID},AUTH0_ISSUER_URL=https://${AUTH0_DOMAIN}/,AUTH0_AUDIENCE=${AUTH0_AUDIENCE},API_URL=${API_URL},ADMIN_URL=${ADMIN_URL},WEB_URL=${WEB_URL}"

echo "Updating consent-management-api..."
gcloud run services update consent-management-api \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --update-env-vars="$COMMON_API_ENV"

echo "Updating consent-management-admin..."
gcloud run services update consent-management-admin \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --port=8080 \
  --update-env-vars="NODE_ENV=production,APP_BASE_URL=${ADMIN_URL},AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID},NEXT_PUBLIC_AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_AUDIENCE=${AUTH0_AUDIENCE},API_URL=${API_URL},NEXT_PUBLIC_API_URL=${API_URL},NEXT_PUBLIC_AUTH0_CONFIGURED=true" \
  --set-secrets="AUTH0_CLIENT_SECRET=AUTH0_CLIENT_SECRET:latest,AUTH0_SECRET=AUTH0_SECRET:latest"

echo "Updating consent-management-web..."
gcloud run services update consent-management-web \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --port=8080 \
  --update-env-vars="NODE_ENV=production,APP_BASE_URL=${WEB_URL},AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID},NEXT_PUBLIC_AUTH0_DOMAIN=${AUTH0_DOMAIN},AUTH0_AUDIENCE=${AUTH0_AUDIENCE},API_URL=${API_URL},NEXT_PUBLIC_API_URL=${API_URL},NEXT_PUBLIC_ADMIN_URL=${ADMIN_URL},NEXT_PUBLIC_AUTH0_CONFIGURED=true,NEXT_PUBLIC_AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}" \
  --set-secrets="AUTH0_CLIENT_SECRET=AUTH0_CLIENT_SECRET:latest,AUTH0_SECRET=AUTH0_SECRET:latest"

echo ""
echo "Done. Ensure Auth0 app has these callback URLs:"
echo "  ${WEB_URL}/auth/callback"
echo "  ${ADMIN_URL}/auth/callback"
