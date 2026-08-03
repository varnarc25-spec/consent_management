# Sprint 12 — Geo and Regulations

**Release:** MVP  
**Phase:** [Phase 11 — Geographic and Regulatory Rules](../phases/phase-11-geographic-and-regulatory-rules.md)

## Goal

Deliver geo-targeted consent experiences with regulation profiles for GDPR, opt-out, and multi-region support.

## Deliverables

- Country detection
- Regional rules
- GDPR-style profile
- Opt-out profile
- Multi-regulation preview

## User Stories

| Story | Title |
|-------|-------|
| 15.1 | Detect Visitor Region |
| 15.2 | Create Regional Configuration Rules |
| 16.1 | GDPR-Style Explicit Consent |
| 16.2 | Opt-Out Privacy Profile |
| 16.3 | Support Multiple Regulations on One Domain |

## Tasks

### Backend
- [x] Region detection service (CDN header, IP geolocation)
- [x] Regional rule engine (conditions → banner/config results)
- [x] Regulation profile templates (GDPR, CCPA, LGPD, etc.)
- [x] Multi-regulation configuration per domain

### SDK
- [x] Region detection and rule application
- [x] GPC (Global Privacy Control) signal handling
- [x] Opt-out profile behavior

### Frontend
- [x] Regional rule configuration UI
- [x] Regulation profile selector
- [x] Banner preview by region

### Privacy
- [x] IP minimization (store derived region only)
- [x] Geolocation disable option

## Dependencies

- Sprint 4 — Banner MVP (banner templates)
- Sprint 3 — Consent Configuration (policy per region)

## Exit Criteria

- Different consent experiences display by visitor region
- GDPR and opt-out profiles work as configured
- Administrators can preview banner for any region

## Definition of Done

See [Definition of Done](../definition-of-done.md).

**Implementation:** `project/docs/SPRINT-12-IMPLEMENTATION.md`
