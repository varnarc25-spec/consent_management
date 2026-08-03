# Sprint 2 — Domains

**Release:** MVP  
**Phase:** [Phase 2 — Organization and Domain Management](../phases/phase-02-organization-and-domain-management.md)  
**Implementation:** [Sprint 2 Status](../../project/docs/SPRINT-02-IMPLEMENTATION.md)

## Goal

Enable organizations to onboard, register domains, verify ownership, and install the CMP script.

## Deliverables

- Domain management
- Domain verification
- Public domain key
- Installation script
- Installation validation foundation

## Tasks

### Backend
- [x] Organization onboarding API (profile fields, contacts)
- [x] Domain CRUD with validation and unique domain keys
- [x] Domain verification service (DNS TXT, HTML file, meta tag)
- [x] Installation snippet generation endpoint
- [x] Installation validation checks API

### Frontend
- [x] Complete onboarding wizard (steps 1–10)
- [x] Domain management dashboard
- [x] Verification status and instructions UI
- [x] Installation script copy/paste UI
- [x] Platform-specific installation guides

### SDK (stub)
- [x] Minimal script loader that reports installation status

## Exit Criteria

- Users can complete onboarding and add verified domains
- Each domain has a unique installation snippet
- Basic installation validation returns pass/warning/fail
