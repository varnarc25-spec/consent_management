# Sprint 15 — APIs and Webhooks

**Release:** Growth  
**Phase:** [Phase 17 — Developer Tools and APIs](../phases/phase-17-developer-tools-and-apis.md)

## Goal

Expose a public REST API with webhooks, API keys, developer documentation, and a sandbox environment.

## Deliverables

- REST API
- API keys
- Webhooks
- Developer documentation
- Sandbox environment

## Epics

| Epic | Title |
|------|-------|
| 22 | Public REST API |
| 23 | Webhooks |
| 24 | SDKs (documentation and API client foundations) |

## Tasks

### Backend
- [x] REST API for all modules (orgs, domains, configs, scans, consent, etc.)
- [x] API versioning and authentication (API keys)
- [x] Rate limiting, pagination, idempotency
- [x] Webhook delivery service (signed payloads, retries)
- [x] Sandbox environment with test data

### Documentation
- [x] OpenAPI specification
- [x] Developer portal / API reference
- [x] Webhook event catalog and integration guide

### Frontend (Admin)
- [x] API key management UI
- [x] Webhook configuration and delivery history

## Dependencies

- All MVP sprints (API surfaces existing functionality)

## Exit Criteria

- All core modules are accessible via REST API
- Webhooks fire reliably for defined events
- OpenAPI docs and sandbox are available for developers

## Definition of Done

See [Definition of Done](../definition-of-done.md).
