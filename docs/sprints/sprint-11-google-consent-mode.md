# Sprint 11 — Google Consent Mode

**Release:** MVP  
**Phases:** [Phase 12 — Google Consent Mode](../phases/phase-12-google-consent-mode.md), [Phase 13 — External Consent Integrations](../phases/phase-13-external-consent-integrations.md) (GTM)

## Goal

Implement Google Consent Mode v2 with default states, consent updates, and GTM integration.

## Deliverables

- Default consent state
- Consent updates
- Basic and advanced modes
- GTM data-layer events
- Consent Mode validator

## User Stories

| Story | Title |
|-------|-------|
| 17.1 | Configure Default Consent State |
| 17.2 | Update Consent After Visitor Choice |
| 17.3 | Support Basic Consent Mode |
| 17.4 | Support Advanced Consent Mode |
| 17.5 | Build Google Consent Mode Validator |
| 18.1 | Google Tag Manager Integration |

## Tasks

### SDK
- [x] `gtag('consent', 'default', ...)` before Google tags
- [x] `gtag('consent', 'update', ...)` on visitor choice
- [x] Category-to-signal mapping (all v2 parameters)
- [x] Basic mode (block tags) and advanced mode (denied defaults)
- [x] Ads data redaction and URL passthrough

### GTM
- [x] GTM template with Consent Initialization trigger
- [x] Data layer events for consent changes
- [x] Preview-mode diagnostics

### Admin UI
- [x] Consent Mode configuration per domain/region
- [x] Consent Mode validator in installation checks

### Testing
- [x] Validate default runs before tags
- [x] Validate update fires on consent change
- [x] Region-specific default state tests

## Dependencies

- Sprint 5 — Consent SDK (consent events)
- Sprint 3 — Consent Configuration (category mappings)

## Exit Criteria

- Google Consent Mode v2 signals are set correctly
- GTM integration works with consent initialization
- Validator detects misconfigurations

## Definition of Done

See [Definition of Done](../definition-of-done.md).

**Implementation:** `project/docs/SPRINT-11-IMPLEMENTATION.md`
