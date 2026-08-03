# Sprint 8 — Scanner MVP

**Release:** MVP  
**Phase:** [Phase 8 — Website Scanner](../phases/phase-08-website-scanner.md)

## Goal

Build a headless website scanner that crawls pages and detects cookies, storage, and trackers.

## Deliverables

- Manual scan
- Headless browser
- Page crawling
- Cookie detection
- Storage detection
- Basic scan results

## User Stories

| Story | Title |
|-------|-------|
| 12.1 | Start a Manual Scan |
| 12.2 | Build Crawl Engine |
| 12.3 | Use Headless Browser Scanning |
| 12.4 | Detect Browser Storage |
| 12.5 | Detect Tracking Technologies |
| 12.7 | Create Scan History |

## Tasks

### Backend
- [x] Scan job queue and worker
- [x] Crawl engine (link following, limits, deduplication)
- [x] Headless browser integration (Playwright/Puppeteer)
- [x] Cookie and storage detection
- [x] Tracker/technology fingerprinting
- [x] Scan results storage and history API

### Frontend
- [x] Scan configuration form (URL, depth, limits)
- [x] Scan progress and status UI
- [x] Basic scan results view (cookies, trackers, pages)

### Infrastructure
- [x] Headless browser worker scaling (in-process worker MVP)
- [x] Scan timeout and retry handling

## Dependencies

- Sprint 2 — Domains (domain registration)

## Exit Criteria

- Users can start a manual scan and view results
- Scanner detects cookies, storage, and common trackers
- Scan history is stored and viewable

## Definition of Done

See [Definition of Done](../definition-of-done.md).

**Implementation notes:** See [SPRINT-08-IMPLEMENTATION.md](../../project/docs/SPRINT-08-IMPLEMENTATION.md).
