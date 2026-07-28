# Deploy to Google Cloud Platform

This guide deploys the Consent Management Platform to **Cloud Run** with **Cloud SQL (PostgreSQL)**, **Artifact Registry**, and **Secret Manager**.

## Architecture

| Service | Cloud Run name | Dockerfile |
|---------|----------------|------------|
| NestJS API | `cmp-api` | `docker/Dockerfile.api` |
| Admin dashboard | `cmp-admin` | `docker/Dockerfile.admin` |
| Marketing site | `cmp-web` | `docker/Dockerfile.web` |
| PostgreSQL | Cloud SQL `cmp-db` | — |

```
Users → Cloud Run (web / admin / api) → Cloud SQL
              ↓
            Auth0
```

## Prerequisites

- [Google Cloud account](https://console.cloud.google.com/) with billing enabled
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- Docker (for local image builds) or Cloud Build (recommended)
- Auth0 tenant configured for production URLs

Set your project:

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

gcloud config set project $PROJECT_ID
```

## 1. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com
```

## 2. Create Artifact Registry

```bash
gcloud artifacts repositories create cmp \
  --repository-format=docker \
  --location=$REGION \
  --description="CMP container images"
```

## 3. Create Cloud SQL (PostgreSQL)

```bash
gcloud sql instances create cmp-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password="CHANGE_ME_STRONG_ROOT_PASSWORD"

gcloud sql databases create cmp --instance=cmp-db

gcloud sql users create cmp \
  --instance=cmp-db \
  --password="CHANGE_ME_STRONG_APP_PASSWORD"
```

Note the connection name:

```bash
export CLOUDSQL_INSTANCE="$PROJECT_ID:$REGION:cmp-db"
echo $CLOUDSQL_INSTANCE
```

### DATABASE_URL for Cloud Run

Cloud Run connects to Cloud SQL via a Unix socket:

```
postgresql://cmp:APP_PASSWORD@/cmp?host=/cloudsql/PROJECT_ID:REGION:cmp-db
```

## 4. Store secrets in Secret Manager

Generate strong values for JWT secrets:

```bash
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 32   # AUTH0_SECRET
```

Create secrets:

```bash
# Database
echo -n "postgresql://cmp:APP_PASSWORD@/cmp?host=/cloudsql/$CLOUDSQL_INSTANCE" | \
  gcloud secrets create DATABASE_URL --data-file=-

# JWT
echo -n "your-access-secret" | gcloud secrets create JWT_ACCESS_SECRET --data-file=-
echo -n "your-refresh-secret" | gcloud secrets create JWT_REFRESH_SECRET --data-file=-

# Auth0
echo -n "your-auth0-client-secret" | gcloud secrets create AUTH0_CLIENT_SECRET --data-file=-
echo -n "your-auth0-secret" | gcloud secrets create AUTH0_SECRET --data-file=-
```

Grant Cloud Run access to secrets (after first deploy creates the default compute SA, or create a dedicated SA):

```bash
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET AUTH0_CLIENT_SECRET AUTH0_SECRET; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$RUN_SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

## 5. Configure Auth0

In the Auth0 dashboard, update your Regular Web Application:

| Setting | Value |
|---------|-------|
| Allowed Callback URLs | `https://admin.YOUR_DOMAIN/auth/callback` |
| Allowed Logout URLs | `https://admin.YOUR_DOMAIN` |
| Allowed Web Origins | `https://admin.YOUR_DOMAIN` |

## 6. Build and deploy

### Option A — Cloud Build (recommended)

Copy and edit substitution values:

```bash
cp deploy/gcp.env.example deploy/gcp.env
# Edit deploy/gcp.env with your URLs, Auth0 domain, Cloud SQL instance, etc.
```

Submit a build from the project root:

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=\
_REGION=us-central1,\
_REPOSITORY=cmp,\
_CLOUDSQL_INSTANCE=$CLOUDSQL_INSTANCE,\
_API_URL=https://api.yourdomain.com,\
_ADMIN_URL=https://admin.yourdomain.com,\
_WEB_URL=https://www.yourdomain.com,\
_NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1,\
_AUTH0_DOMAIN=your-tenant.us.auth0.com,\
_AUTH0_CLIENT_ID=your-client-id
```

### Option B — Local Docker build

```bash
# Authenticate Docker with Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# API
docker build -f docker/Dockerfile.api \
  -t ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/api:latest .
docker push ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/api:latest

# Admin (build-time env for Next.js public vars)
docker build -f docker/Dockerfile.admin \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1 \
  --build-arg AUTH0_DOMAIN=your-tenant.us.auth0.com \
  -t ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/admin:latest .
docker push ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/admin:latest

# Web
docker build -f docker/Dockerfile.web \
  -t ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/web:latest .
docker push ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/web:latest
```

Deploy each service:

```bash
gcloud run deploy cmp-api \
  --image ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/api:latest \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances $CLOUDSQL_INSTANCE \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,JWT_ACCESS_SECRET=JWT_ACCESS_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest \
  --set-env-vars="NODE_ENV=production,API_PREFIX=api/v1,ADMIN_URL=https://admin.yourdomain.com,API_URL=https://api.yourdomain.com,EMAIL_VERIFICATION_ENABLED=true,DOMAIN_AUTO_VERIFY=false"

gcloud run deploy cmp-admin \
  --image ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/admin:latest \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-secrets=AUTH0_CLIENT_SECRET=AUTH0_CLIENT_SECRET:latest,AUTH0_SECRET=AUTH0_SECRET:latest \
  --set-env-vars="NODE_ENV=production,APP_BASE_URL=https://admin.yourdomain.com,AUTH0_DOMAIN=your-tenant.us.auth0.com,AUTH0_CLIENT_ID=your-client-id,NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com"

gcloud run deploy cmp-web \
  --image ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/web:latest \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production"
```

## 7. Run database migrations

After the API image is deployed, run migrations once via a Cloud Run Job:

```bash
gcloud run jobs create cmp-migrate \
  --image ${REGION}-docker.pkg.dev/$PROJECT_ID/cmp/api:latest \
  --region $REGION \
  --add-cloudsql-instances $CLOUDSQL_INSTANCE \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest \
  --command=sh \
  --args=deploy/migrate.sh \
  --max-retries=1

gcloud run jobs execute cmp-migrate --region $REGION --wait
```

Seed roles and permissions (one-time, from your machine via Cloud SQL Auth Proxy):

```bash
# Terminal 1 — start proxy
cloud-sql-proxy $CLOUDSQL_INSTANCE

# Terminal 2 — seed
export DATABASE_URL="postgresql://cmp:APP_PASSWORD@127.0.0.1:5432/cmp"
pnpm db:seed
```

## 8. Custom domains (optional)

In Cloud Console → **Cloud Run** → select service → **Manage custom domains**:

| Domain | Service |
|--------|---------|
| `api.yourdomain.com` | `cmp-api` |
| `admin.yourdomain.com` | `cmp-admin` |
| `www.yourdomain.com` | `cmp-web` |

Add the DNS records Google provides to your domain registrar.

## 9. CI/CD with GitHub

1. Connect your GitHub repo in **Cloud Build → Triggers**
2. Create a trigger on push to `main`
3. Set config file to `cloudbuild.yaml`
4. Add substitution variables from `deploy/gcp.env.example`

## Environment variables reference

### API (`cmp-api`)

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Secret Manager | Cloud SQL socket format |
| `JWT_ACCESS_SECRET` | Secret Manager | Min 32 chars |
| `JWT_REFRESH_SECRET` | Secret Manager | Min 32 chars |
| `ADMIN_URL` | Env var | CORS origin |
| `API_URL` | Env var | Public API base URL |
| `EMAIL_VERIFICATION_ENABLED` | Env var | Set `true` in production |
| `DOMAIN_AUTO_VERIFY` | Env var | Set `false` in production |
| `SMTP_*` | Env var | Optional email delivery |

### Admin (`cmp-admin`)

| Variable | Source | Notes |
|----------|--------|-------|
| `AUTH0_DOMAIN` | Env var | |
| `AUTH0_CLIENT_ID` | Env var | |
| `AUTH0_CLIENT_SECRET` | Secret Manager | |
| `AUTH0_SECRET` | Secret Manager | `openssl rand -hex 32` |
| `APP_BASE_URL` | Env var | Admin URL |
| `NEXT_PUBLIC_API_URL` | Build arg | Baked into image at build time |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Env var | Runtime fallback |

## Local Docker smoke test

```bash
# Build API image
docker build -f docker/Dockerfile.api -t cmp-api:local .

# Run against local postgres (from docker compose)
docker run --rm -p 8080:8080 \
  --env-file .env \
  -e PORT=8080 \
  -e NODE_ENV=production \
  cmp-api:local
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API can't connect to DB | Verify `--add-cloudsql-instances` and `DATABASE_URL` socket format |
| Admin Auth0 redirect error | Check callback URL matches `APP_BASE_URL` |
| CORS errors | Set `ADMIN_URL` on API to exact admin origin |
| `NEXT_PUBLIC_*` wrong in admin | Rebuild admin image with correct build args |
| `path "docker" not found` | Set build context to `.` (repo root), not `docker` — see note below |

### Cloud Build trigger settings (GCP Console)

If you created the trigger manually (not via `cloudbuild.yaml`), use:

| Setting | Value |
|---------|--------|
| **Build context** | `.` (repository root) |
| **Dockerfile path** | `docker/Dockerfile.api` (or `.admin` / `.web`) |

Do **not** set the build context to `docker` — the Dockerfiles need the full monorepo as context (`apps/`, `packages/`, `pnpm-lock.yaml`, etc.).
| Migrations fail | Run `cmp-migrate` job; check Cloud SQL user permissions |

## Cost estimate (low traffic)

| Resource | ~Monthly |
|----------|----------|
| Cloud SQL db-f1-micro | $10–15 |
| Cloud Run (3 services) | $0–5 |
| Artifact Registry | ~$1 |
| **Total** | **~$15–25** |

## Files in this deployment setup

| File | Purpose |
|------|---------|
| `docker/Dockerfile.api` | NestJS API image |
| `docker/Dockerfile.admin` | Next.js admin image |
| `docker/Dockerfile.web` | Next.js marketing site image |
| `cloudbuild.yaml` | Cloud Build CI/CD pipeline |
| `deploy/gcp.env.example` | Substitution variable template |
| `deploy/migrate.sh` | Prisma migrate for Cloud Run Job |
| `.dockerignore` | Excludes dev artifacts from builds |
