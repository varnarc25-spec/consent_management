# Sprint 9 — Cookie Repository

**Release:** MVP  
**Phase:** [Phase 9 — Cookie and Tracker Repository](../phases/phase-09-cookie-and-tracker-repository.md)

## Goal

Build the cookie knowledge base with automatic matching, unknown-cookie review, and scan comparison.

## Deliverables

- Known-cookie database
- Automatic matching
- Unknown-cookie review
- Classification interface
- Scan comparison

## User Stories

| Story | Title |
|-------|-------|
| 13.1 | Create Master Cookie Database |
| 13.2 | Automatically Match Detected Cookies |
| 13.3 | Manage Unknown Cookies |
| 13.5 | Detect Cookie Changes |

## Tasks

### Backend
- [x] Master cookie database schema and seed data
- [x] Matching engine (exact, prefix, regex, vendor signature)
- [x] Unknown cookie workflow API
- [x] Scan comparison (new, removed, changed cookies)

### Frontend
- [x] Cookie classification management UI
- [x] Unknown cookie review queue
- [x] Scan diff view (new/removed/changed)

### Data
- [x] Initial cookie/vendor database population
- [x] Confidence scoring for automated matches

## Dependencies

- Sprint 8 — Scanner MVP (scan results as input)

## Exit Criteria

- Known cookies are auto-categorized with confidence scores
- Unknown cookies enter a review workflow
- Scan comparisons highlight cookie changes

## Definition of Done

See [Definition of Done](../definition-of-done.md).

**Implementation notes:** See [SPRINT-09-IMPLEMENTATION.md](../../project/docs/SPRINT-09-IMPLEMENTATION.md).
