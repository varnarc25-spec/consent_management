# Sprint 8 — Scanner MVP Implementation

**Status:** Complete

## Database

New tables: `domain_scans`, `domain_scan_pages`, `domain_scan_findings`

Enums: `scan_status`, `scan_finding_type`, `scan_consent_state`

Migration: `20260803140000_sprint8_scanner`

## Backend API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/domains/:domainId/scans` | `scan.view` |
| GET | `/domains/:domainId/scans/:scanId` | `scan.view` |
| POST | `/domains/:domainId/scans` | `scan.run` |

Scans run asynchronously in-process after creation. One active scan per domain at a time.

### Scanner engine (`apps/api/src/scans/scanner/`)

- **Playwright** headless Chromium
- Crawl: internal link following, depth/page limits, include/exclude paths, URL deduplication
- Consent simulation: clicks `[data-cmp-action="accept-all"]` and `reject-all` when present
- Detection per page state (`BEFORE_CONSENT`, `AFTER_ACCEPT`, `AFTER_REJECT`):
  - HTTP cookies
  - localStorage / sessionStorage / IndexedDB / service workers
  - Scripts, iframes, tracking pixels
  - Network requests to known tracker hosts
- Known technology fingerprints (GTM, GA, Meta, LinkedIn, YouTube, etc.)

`maxPages` is capped by domain `scanLimit`.

## Admin UI

- `/domains/[id]/scans` — start scan form + history table (auto-refresh while running)
- `/domains/[id]/scans/[scanId]` — pages scanned, filterable findings table
- Link from domain detail page

## Tests

- `crawl.util.spec.ts` — URL normalization, path rules, link extraction

## Setup

Install Playwright browser for the API worker:

```bash
cd project
pnpm install
pnpm --filter @cmp/api exec playwright install chromium
pnpm db:migrate:deploy
```

## Exit criteria

- Users can start a manual scan and view results
- Scanner detects cookies, storage, and common trackers
- Scan history is stored and viewable
