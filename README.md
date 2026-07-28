# Consent Management Platform

Multi-tenant consent management platform — implementation based on [`../docs`](../docs).

## Stack

| Layer | Choice |
|-------|--------|
| Apps | Next.js 15 (`web`, `admin`), NestJS (`api`) |
| Data | PostgreSQL + Prisma |
| Auth | Email/password, JWT access + refresh tokens |
| Monorepo | pnpm + Turborepo |

## Repository layout

```text
apps/web          Public marketing site
apps/admin        Admin dashboard
apps/api          NestJS REST API
packages/*        Shared libraries (@cmp/*)
```

## Getting started

```bash
pnpm install
cp .env.example .env

# Start PostgreSQL
docker compose up -d

pnpm db:generate
pnpm db:migrate
pnpm db:seed

pnpm dev:api     # http://localhost:4000/api/v1
pnpm dev:admin   # http://localhost:3001
pnpm dev:web     # http://localhost:3000
```

## Deployment

Deploy to Google Cloud (Cloud Run + Cloud SQL): see [`docs/DEPLOY-GCP.md`](./docs/DEPLOY-GCP.md).

## Sprint 1 — Foundation (Complete)

- Multi-tenant organizations (create, update, soft-delete, permanent delete)
- Email/password authentication with verification, reset, lockout, login history
- RBAC with 8 roles and 13 permissions
- Audit logging with search and CSV export
- User invite and role management
- Onboarding wizard
- Public marketing site (`apps/web`)

See [`docs/SPRINT-01-IMPLEMENTATION.md`](./docs/SPRINT-01-IMPLEMENTATION.md).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps |
| `pnpm dev:web` | Public site |
| `pnpm dev:admin` | Admin dashboard |
| `pnpm dev:api` | API server |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run migrations (dev) |
| `pnpm db:migrate:deploy` | Run migrations (production) |
| `pnpm db:seed` | Seed roles and permissions |
