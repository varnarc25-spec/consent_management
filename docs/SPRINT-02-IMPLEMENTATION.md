# Sprint 2 — Domains Implementation

**Status:** Complete

## Database

- Extended `Organization` with onboarding fields (business type, regulation, contacts, DPO, onboarding step)
- `Domain` model with unique `hostname` and `domainKey`
- `InstallationValidation` for historical check results
- `Domain.sdkLastHeartbeat` stores latest SDK telemetry for validation checks

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/organizations/me/onboarding` | Onboarding status & progress |
| GET/POST/PATCH/DELETE | `/domains` | Domain CRUD |
| GET | `/domains/:id/verification-instructions` | DNS/HTML/meta/CMP instructions |
| POST | `/domains/:id/verify` | Run verification check |
| GET | `/domains/:id/installation-script` | Snippet + platform guides |
| POST | `/domains/:id/validate-installation` | Run installation checks |
| GET | `/domains/:id/validation-history` | Past validation results |
| GET | `/public/cmp/config/:domainKey` | SDK config (public, verified production only) |
| GET | `/public/cmp/sdk.js` | CMP loader script |
| POST | `/public/cmp/heartbeat` | SDK installation heartbeat |
| GET | `/public/cmp/verify/:domainKey.html` | HTML verification file |

## Installation validation checks

All Phase 2 checks are implemented:

| Check | Notes |
|-------|-------|
| Domain key valid | PASS/FAIL |
| CMP script detected | Uses `sdkLastSeenAt` |
| Script loaded before trackers | Uses heartbeat `scriptLoadedFirst` |
| Domain ownership verified | FAIL for unverified production domains |
| Banner configuration loaded | WARNING until Sprint 3 |
| Default consent state applied | Uses heartbeat |
| Consent update event detected | WARNING until user interacts |
| Auto-blocking enabled | Domain + heartbeat |
| Google Consent Mode | PASS if detected, WARNING otherwise |
| Duplicate CMP scripts | PASS/WARNING |
| JavaScript errors detected | PASS/FAIL |

Production config publishing is blocked for unverified production domains (`DOMAIN_NOT_VERIFIED`).

## Admin UI

- 10-step onboarding wizard (`/onboarding`) with all organization fields
- Onboarding step 10 runs validation and shows results
- Domain list (`/domains`) with group and scan limit on create
- Domain detail with enable/disable, group, scan limit, verify, install, validate, history (`/domains/:id`)

## SDK

- `@cmp/sdk` package documents the loader
- Script served from API, reports heartbeat telemetry and loads config

## Deferred to later sprints

- Steps 7–8 in onboarding (scan, banner) are placeholders for Sprint 8 and 3–4
- Banner configuration check remains WARNING until Sprint 3
