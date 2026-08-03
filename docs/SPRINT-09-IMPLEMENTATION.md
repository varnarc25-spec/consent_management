# Sprint 9 — Cookie Repository Implementation

**Status:** Complete

## Database

- `cookie_definitions` — platform master cookie knowledge base (seeded)
- `domain_cookies` — per-domain cookie catalog with classification and review status

Migration: `20260803150000_sprint9_cookie_repository`

## Master cookie seed

12 common cookies seeded via `pnpm db:seed` (Google Analytics, Meta, DoubleClick, Cloudflare, Hotjar, LinkedIn, CMP, etc.)

## Matching engine

`cookie-matcher.ts` supports:

- Exact name, prefix, suffix, regex
- Provider domain, script source, network endpoint
- Vendor signature aliases
- Confidence scoring (100 = exact, threshold 80 for auto-match)

## Backend API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/cookie-definitions` | `scan.view` |
| GET | `/domains/:domainId/cookies` | `scan.view` |
| GET | `/domains/:domainId/cookies/unknown` | `scan.view` |
| PATCH | `/domains/:domainId/cookies/:cookieId` | `cookie.manage` |
| GET | `/domains/:domainId/scans/compare?baseline=&target=` | `scan.view` |

Scan completion automatically ingests cookie findings into the domain cookie repository.

## Admin UI

- `/domains/[id]/cookies` — full catalog + review queue with classification form
- Scan detail page — compare with previous scan (new / removed / changed cookies)

## Tests

- `cookie-matcher.spec.ts` — matching and confidence threshold
- `scan-comparison.spec.ts` — diff detection

## Exit criteria

- Known cookies auto-categorized with confidence scores
- Unknown cookies enter review workflow
- Scan comparisons highlight cookie changes
