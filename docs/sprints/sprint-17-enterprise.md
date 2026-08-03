# Sprint 17 — Enterprise

**Release:** Enterprise  
**Phase:** [Phase 19 — Team and Enterprise Features](../phases/phase-19-team-and-enterprise-features.md)

## Goal

Deliver enterprise-grade features including SSO, cross-domain consent, data retention, and white-label.

## Deliverables

- Custom roles
- SSO
- Cross-domain consent
- Data retention controls
- White-label configuration

## Epics

| Epic | Title |
|------|-------|
| 27 | Advanced User Management |
| 28 | Cross-Domain Consent |
| 29 | White Label |
| 30 | Data Residency and Retention |

## Tasks

### Backend
- [x] Custom roles and domain-level permissions
- [x] SSO integration (SAML/OIDC via Auth0 connection)
- [x] Two-factor authentication (MFA via IdP flag)
- [x] Cross-domain consent token and synchronization
- [x] Data retention policies and deletion schedules
- [x] Regional data storage configuration
- [x] White-label configuration API

### Frontend
- [x] User invitation and role management (advanced — custom roles API)
- [x] SSO configuration UI
- [x] Cross-domain group management
- [x] Data retention settings
- [x] White-label branding editor

### Infrastructure
- [x] Encryption at rest and key rotation (documented)
- [x] Backup and disaster-recovery procedures (documented)

## Dependencies

- Sprint 1 — Foundation (user/role system)
- Sprint 5 — Consent SDK (cross-domain consent)

## Exit Criteria

- SSO login works with a test IdP
- Cross-domain consent syncs across configured domains
- White-label branding applies to dashboard and CMP
- Data retention policies execute on schedule

## Definition of Done

See [Definition of Done](../definition-of-done.md).
