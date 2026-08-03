# Sprint 3 — Consent Configuration

**Release:** MVP  
**Phase:** [Phase 3 — Consent Data Model](../phases/phase-03-consent-data-model.md)  
**Implementation:** [Sprint 3 Status](../../project/docs/SPRINT-03-IMPLEMENTATION.md)

## Goal

Define the consent data model with categories, policy versioning, and configuration publishing.

## Deliverables

- Consent categories (default + custom)
- Policy versioning
- Configuration publishing
- Basic banner content

## User Stories

| Story | Title |
|-------|-------|
| 4.1 | Create Default Consent Categories |
| 4.2 | Create Custom Categories |
| 5.1 | Create Consent Policy Versioning |
| 5.2 | Trigger Consent Renewal |

## Tasks

### Backend
- [x] Consent category model and APIs
- [x] Policy version model (draft, scheduled, published, archived)
- [x] Configuration publishing pipeline
- [x] Consent renewal trigger logic

### Frontend
- [x] Category management UI
- [x] Policy version editor
- [x] Publish/schedule/archive workflow
- [x] Basic banner content fields (title, description, buttons)

### Database
- [x] Category, policy version, and configuration tables
- [x] Version history and immutability constraints

## Dependencies

- Sprint 2 — Domains (domain-scoped configuration)

## Exit Criteria

- Default and custom categories can be configured per domain
- Policy versions can be published without silent modification
- Published configuration is available for the SDK to fetch

## Definition of Done

See [Definition of Done](../definition-of-done.md).
