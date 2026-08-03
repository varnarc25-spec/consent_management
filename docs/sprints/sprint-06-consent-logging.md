# Sprint 6 — Consent Logging

**Release:** MVP  
**Phase:** [Phase 6 — Consent Collection and Audit Evidence](../phases/phase-06-consent-collection-and-audit-evidence.md)

**Implementation:** [Sprint 6 Status](../../project/docs/SPRINT-06-IMPLEMENTATION.md)

## Goal

Record immutable consent decisions with full audit trail, proof views, and withdrawal support.

## Deliverables

- Server-side consent records
- Consent history
- Withdraw consent
- Consent proof view
- Basic exports

## User Stories

| Story | Title |
|-------|-------|
| 9.1 | Record Consent Decisions |
| 9.2 | Record Consent History |
| 9.3 | Create Proof-of-Consent View |
| 9.4 | Withdraw Consent |

## Tasks

### Backend
- [x] Consent record storage (immutable, append-only history)
- [x] Proof hash generation
- [x] Consent search API (by ID, date, domain)
- [x] Withdrawal recording and state update
- [x] Basic export endpoints (CSV, JSON)

### Frontend (Admin)
- [x] Consent log search and filter UI
- [x] Proof-of-consent detail view
- [x] Export buttons (print, PDF, JSON, CSV)

### SDK
- [x] Submit consent decisions to server
- [x] Withdrawal flow integration
- [x] Stop denied services on withdrawal

## Dependencies

- Sprint 5 — Consent SDK (consent state and events)

## Exit Criteria

- Every consent action creates an immutable server record
- Administrators can view proof-of-consent with verification hash
- Visitors can withdraw consent with full audit trail

## Definition of Done

See [Definition of Done](../definition-of-done.md).
