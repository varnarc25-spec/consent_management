# Sprint 7 — Manual Blocking

**Release:** MVP  
**Phase:** [Phase 7 — Script and Tracker Blocking](../phases/phase-07-script-and-tracker-blocking.md) (Epic 10)

## Goal

Implement manual script and iframe blocking with category-based execution after consent.

## Deliverables

- Inline script blocking
- External script blocking
- Iframe blocking
- Placeholders
- Category-based execution

## User Stories

| Story | Title |
|-------|-------|
| 10.1 | Block Inline Scripts |
| 10.2 | Block External Scripts |
| 10.3 | Block Iframes and Embedded Content |
| 10.4 | Block Tracking Pixels |

## Tasks

### SDK
- [x] Inline script interception (category/vendor attributes)
- [x] External script URL detection and blocking
- [x] Dynamic script loading after consent
- [x] Iframe placeholder component with "Allow" action
- [x] Tracking pixel blocking (image, beacon)

### Admin UI
- [x] Script-to-category mapping interface
- [x] Placeholder content configuration

### Testing
- [x] Test pages with inline, external, iframe, and pixel trackers
- [x] Verify scripts execute only after correct consent

## Dependencies

- Sprint 5 — Consent SDK (consent state API)

## Exit Criteria

- Restricted scripts do not execute before consent
- Iframes show placeholders with vendor explanation
- Scripts activate correctly after consent is granted

## Definition of Done

See [Definition of Done](../definition-of-done.md).

**Implementation notes:** See [SPRINT-07-IMPLEMENTATION.md](../../project/docs/SPRINT-07-IMPLEMENTATION.md).
