# Sprint 3 — Consent Configuration Implementation

**Status:** Complete

## Database

- `ConsentCategory` — default and custom categories per domain
- `PolicyVersion` — draft, scheduled, published, archived with immutable snapshots
- `ConsentRenewal` — renewal trigger history
- Default categories seeded when a domain is created

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/domains/:domainId/consent/categories` | List / create categories |
| PATCH/DELETE | `/domains/:domainId/consent/categories/:id` | Update / delete category |
| POST | `/domains/:domainId/consent/categories/reorder` | Reorder categories |
| GET | `/domains/:domainId/consent/policies` | List policy versions |
| GET | `/domains/:domainId/consent/policies/draft` | Get or create draft |
| PATCH | `/domains/:domainId/consent/policies/:id` | Update draft banner/content |
| POST | `/domains/:domainId/consent/policies/:id/publish` | Publish policy |
| POST | `/domains/:domainId/consent/policies/:id/schedule` | Schedule policy |
| POST | `/domains/:domainId/consent/policies/:id/archive` | Archive policy |
| GET/POST | `/domains/:domainId/consent/renewals` | List / trigger renewals |

Public SDK config (`GET /public/cmp/config/:domainKey`) now returns published categories, banner content, policy version, and renewal flags.

## Default categories

1. Strictly Necessary (required)
2. Preferences
3. Functional
4. Analytics
5. Performance
6. Marketing
7. Social Media
8. Unclassified

## Admin UI

- `/domains/[id]/consent` — categories, policy editor, publish/schedule, renewal
- Onboarding step 8 links to consent configuration
- Domain detail links to consent configuration

## Publishing rules

- Published policies snapshot categories and cannot be edited
- Publishing archives the previous published version
- `Domain.configVersion` increments on publish and renewal
- Scheduled policies auto-publish when due

## Permission

All consent endpoints require `banner.configure`.
