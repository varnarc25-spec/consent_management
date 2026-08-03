# Sprint 16 — WordPress and GTM

**Release:** MVP  
**Phase:** [Phase 18 — WordPress and CMS Integrations](../phases/phase-18-wordpress-and-cms-integrations.md)

## Goal

Deliver WordPress plugin and GTM template with installation wizard and validation.

## Deliverables

- WordPress plugin
- GTM template
- Installation wizard
- Plugin validation
- Cookie declaration integration

## Epics

| Epic | Title |
|------|-------|
| 25 | WordPress Plugin |
| 26 | Other CMS Integrations (GTM focus) |

## Tasks

### WordPress Plugin
- [x] Account connection and domain selection
- [x] Automatic CMP script injection
- [x] Auto-blocking enablement
- [x] Cookie declaration shortcode
- [x] Privacy trigger shortcode
- [x] Google Consent Mode settings
- [x] Scan initiation from WP admin
- [x] Installation validation
- [x] Multisite and cache-plugin compatibility

### GTM
- [x] GTM community template (if not completed in Sprint 11)
- [x] Container installation guide
- [x] Preview-mode diagnostics

### Frontend (Admin)
- [x] Installation wizard for WordPress/GTM
- [x] Plugin validation status in dashboard

## Dependencies

- Sprint 5 — Consent SDK (script loader)
- Sprint 11 — Google Consent Mode (GTM integration)
- Sprint 10 — Preference Center (cookie declaration, privacy trigger)

## Exit Criteria

- WordPress plugin installs and validates CMP on a test site
- GTM template enables consent-aware tag loading
- Cookie declaration shortcode renders correctly

## Definition of Done

See [Definition of Done](../definition-of-done.md).
