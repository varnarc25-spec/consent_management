# Sprint 5 — Consent SDK

**Release:** MVP  
**Phases:** [Phase 5 — Client-Side Consent SDK](../phases/phase-05-client-side-consent-sdk.md), [Phase 10 — Preference Center](../phases/phase-10-preference-center.md)

**Implementation:** [Sprint 5 Status](../../project/docs/SPRINT-05-IMPLEMENTATION.md)

## Goal

Build the public JavaScript SDK for loading configuration, managing consent state, and reopening preferences.

## Deliverables

- Load configuration
- Read and write consent
- Anonymous visitor identifier
- Consent events
- Preference reopening

## User Stories

| Story | Title |
|-------|-------|
| 8.1 | Load Domain Configuration |
| 8.2 | Create Consent State API |
| 8.3 | Generate Anonymous Visitor Identifier |
| 8.4 | Store Consent Locally |
| 14.1 | Create Privacy Trigger |

## Tasks

### SDK
- [x] Async configuration loader with region detection
- [x] Consent state API (`getConsent`, `setConsent`, `acceptAll`, etc.)
- [x] Event system (`onConsentReady`, `onConsentChanged`)
- [x] Anonymous visitor ID generation and rotation
- [x] Local storage (cookie + localStorage fallback)
- [x] Privacy trigger (floating icon, footer link, API call)

### Backend
- [x] Configuration delivery API (CDN-ready)
- [x] Consent record submission endpoint

### Testing
- [x] SDK integration test suite
- [x] Cross-page navigation consent persistence

## Dependencies

- Sprint 4 — Banner MVP (banner renderer)
- Sprint 3 — Consent Configuration (policy data)

## Exit Criteria

- SDK loads asynchronously without blocking the page
- Consent state persists across page navigation
- Visitors can reopen preferences after initial consent

## Definition of Done

See [Definition of Done](../definition-of-done.md).
