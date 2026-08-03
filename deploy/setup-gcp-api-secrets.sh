#!/usr/bin/env bash
# Create Secret Manager secrets for consent-management-api on Cloud Run.
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project myweb-503314
#
# Usage (from project root):
#   ./deploy/setup-gcp-api-secrets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="myweb-503314"
REGION="us-central1"
SERVICE="consent-management-api"
IMAGE_TAG="${1:-latest}"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/consent_management/${SERVICE}:${IMAGE_TAG}"

API_URL="https://consent-management-api-414895350436.us-central1.run.app"
ADMIN_URL="https://consent-management-admin-414895350436.us-central1.run.app"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set. Add it to .env or export it before running." >&2
  exit 1
fi

gcloud config set project "$PROJECT_ID"

create_or_update_secret() {
  local name="$1"
  local value="$2"
  if gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    echo "Updating secret: $name"
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-
  else
    echo "Creating secret: $name"
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=-
  fi
}

JWT_ACCESS="$(openssl rand -hex 32)"
JWT_REFRESH="$(openssl rand -hex 32)"

create_or_update_secret "DATABASE_URL" "$DATABASE_URL"
create_or_update_secret "JWT_ACCESS_SECRET" "$JWT_ACCESS"
create_or_update_secret "JWT_REFRESH_SECRET" "$JWT_REFRESH"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Granting Secret Manager access to $RUN_SA"
for SECRET in DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done

echo "Updating Cloud Run service: $SERVICE (image: $IMAGE)"
gcloud run services update "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE" \
  --port=8080 \
  --startup-probe=initialDelaySeconds=15,timeoutSeconds=5,periodSeconds=10,failureThreshold=12,httpGet.path=/api/v1/health,httpGet.port=8080 \
  --set-env-vars="NODE_ENV=production,API_PREFIX=api/v1,API_URL=${API_URL}/api/v1,ADMIN_URL=${ADMIN_URL},WEB_URL=https://consent-management-web-414895350436.us-central1.run.app,EMAIL_VERIFICATION_ENABLED=false,DOMAIN_AUTO_VERIFY=false,AUTH0_DOMAIN=dev-varnarc.us.auth0.com,AUTH0_AUDIENCE=https://api.consent-management.varnarc.com,AUTH0_ISSUER_URL=https://dev-varnarc.us.auth0.com/" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_ACCESS_SECRET=JWT_ACCESS_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest"

echo ""
echo "Done. Test:"
echo "  ${API_URL}/api/v1/health"
