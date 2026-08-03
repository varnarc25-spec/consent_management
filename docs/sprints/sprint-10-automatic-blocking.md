# Sprint 10 — Automatic Blocking

**Release:** MVP  
**Phase:** [Phase 7 — Script and Tracker Blocking](../phases/phase-07-script-and-tracker-blocking.md) (Epic 11)

## Goal

Implement automatic script/network interception with a rules engine and blocking debugger.

## Deliverables

- Blocking rules
- Dynamic script interception
- Vendor patterns
- Debugger
- Pre-consent violation detection

## User Stories

| Story | Title |
|-------|-------|
| 11.1 | Intercept Script Creation |
| 11.2 | Intercept Network Resources |
| 11.3 | Create Blocking Rules Engine |
| 11.4 | Add Blocking Debugger |

## Tasks

### SDK
- [x] Script creation interceptor (static, dynamic, `document.write`, DOM)
- [x] Network resource interceptor (fetch, XHR, beacon, images)
- [x] Blocking rules engine (URL, regex, vendor, category, region)
- [x] Blocking debugger overlay/mode

### Backend
- [x] Vendor pattern database
- [x] Pre-consent violation detection and alerting

### Admin UI
- [x] Rules management interface
- [x] Debugger view in installation validator

### Testing
- [x] Tag manager script interception tests
- [x] Verify no breakage of essential APIs

## Dependencies

- Sprint 7 — Manual Blocking (blocking foundation)
- Sprint 9 — Cookie Repository (vendor patterns)

## Exit Criteria

- Non-essential trackers are blocked automatically before consent
- Rules engine supports multiple match types and actions
- Debugger shows blocked resources with remediation guidance

## Definition of Done

See [Definition of Done](../definition-of-done.md).

**Implementation notes:** See [SPRINT-10-IMPLEMENTATION.md](../../project/docs/SPRINT-10-IMPLEMENTATION.md).
