# GCP Cloud Run deployment

Production URLs (project `myweb-503314`, region `us-central1`):

| Service | Cloud Run name | URL |
|---------|----------------|-----|
| API | `consent-management-api` | https://consent-management-api-414895350436.us-central1.run.app |
| Admin | `consent-management-admin` | https://consent-management-admin-414895350436.us-central1.run.app |
| Web | `consent-management-web` | https://consent-management-web-414895350436.us-central1.run.app |

## Quick start

### 1. One-time secrets (API)

```bash
gcloud auth login
gcloud config set project myweb-503314
cd /path/to/consent_management/project
./deploy/setup-gcp-api-secrets.sh
```

Creates `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` in Secret Manager.

### 2. Fix Cloud Build triggers (important)

**Do not use Inline Dockerfile builds with `docker` as the build context** — that causes `package.json not found` (only ~9 KB uploaded).

For each trigger (API, Admin, Web):

1. Cloud Build → **Triggers** → edit trigger
2. **Configuration** → **Cloud Build configuration file (yaml or json)**
3. **Location** → **Repository**
4. **Source directory** → leave **empty** (repo root)
5. **Config file**:

| Trigger service | File |
|-----------------|------|
| API | `cloudbuild.api.yaml` |
| Admin | `cloudbuild.admin.yaml` |
| Web | `cloudbuild.web.yaml` |

6. Save and re-run

See [`triggers/README.md`](./triggers/README.md) if you must keep Inline config.

### 3. Auth0 (admin login)

See [`../docs/AUTH0-SETUP.md`](../docs/AUTH0-SETUP.md).

Set `_AUTH0_DOMAIN` and `_AUTH0_CLIENT_ID` on the **admin** trigger substitutions.

### 4. Deploy API after build

If the API image built but deploy failed, redeploy with secrets:

```bash
./deploy/setup-gcp-api-secrets.sh COMMIT_SHA
# e.g. ./deploy/setup-gcp-api-secrets.sh 09e51b9
```

### 5. Test

```bash
curl https://consent-management-api-414895350436.us-central1.run.app/api/v1/health
```

## Files

| File | Purpose |
|------|---------|
| `setup-gcp-api-secrets.sh` | Create API secrets + deploy Cloud Run revision |
| `cloudrun-api.env.example` | Env var reference |
| `gcp.env.example` | Cloud Build substitution template |
| `migrate.sh` | Prisma migrations (Cloud Run Job) |
| `triggers/*.yaml` | Correct Inline trigger YAML (copy-paste) |

## Docker builds (local)

From **project root** (not `docker/`):

```bash
docker build -f docker/Dockerfile.api -t cmp-api .
docker build -f docker/Dockerfile.admin \
  --build-arg NEXT_PUBLIC_API_URL=https://consent-management-api-414895350436.us-central1.run.app/api/v1 \
  --build-arg AUTH0_DOMAIN=your-tenant.us.auth0.com \
  -t cmp-admin .
docker build -f docker/Dockerfile.web -t cmp-web .
```
