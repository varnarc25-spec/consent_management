# Docker images

## Important: build context must be the repo root

These Dockerfiles **cannot** be built with `docker/` as the build context.

The monorepo needs `package.json`, `apps/`, `packages/`, and `pnpm-lock.yaml` from the **repository root**.

### Correct

```bash
# Run from repository root (consent_management/project/)
docker build -f docker/Dockerfile.api -t cmp-api:latest .
docker build -f docker/Dockerfile.admin -t cmp-admin:latest .
docker build -f docker/Dockerfile.web -t cmp-web:latest .
```

### Wrong (causes `package.json not found`)

```bash
cd docker
docker build -f Dockerfile.api .
```

## Google Cloud Build / Cloud Run

| Setting | Value |
|---------|--------|
| **Source / build context** | `.` (repository root) |
| **Dockerfile path** | `docker/Dockerfile.api` |

Do **not** set the source directory to `docker`.

### Recommended: use `cloudbuild.yaml`

From the repo root:

```bash
gcloud builds submit --config=cloudbuild.yaml .
```

Or create a Cloud Build trigger that uses `cloudbuild.yaml` at the repository root (not a manual Dockerfile-only build pointed at `docker/`).
