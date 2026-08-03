# Sprint 15 — APIs and Webhooks

## Summary

Sprint 15 exposes a developer REST API authenticated with API keys, webhook delivery with signed payloads and retries, admin management UI, OpenAPI docs, and sandbox API keys tied to sandbox domains.

## Database

- `api_keys` — hashed keys, scopes, production/sandbox environment
- `webhook_endpoints` — URL, signing secret, subscribed events
- `webhook_deliveries` — delivery attempts and status
- `api_idempotency_keys` — POST idempotency cache (24h)

Migration: `20260803190000_sprint15_apis_webhooks`

## Developer REST API

Base path: `/api/v1/developer/v1`

Authentication:

```http
Authorization: Bearer cmp_live_…
```

or `X-API-Key: cmp_test_…`

| Endpoint | Scope |
|----------|-------|
| `GET /domains` | `domains:read` |
| `GET /domains/:id` | `domains:read` |
| `GET /domains/:id/consent-records` | `consent:read` |
| `GET /domains/:id/scans` | `scans:read` |
| `POST /domains/:id/scans` | `scans:write` (+ `Idempotency-Key` header) |
| `GET /domains/:id/cookies` | `cookies:read` |
| `GET /domains/:id/policies` | `policies:read` |

Pagination: `page`, `limit` query params.

**Sandbox:** `cmp_test_*` keys only access domains with `environment=sandbox`. Production keys access non-sandbox domains.

## Management API (JWT)

- `GET/POST/DELETE /api-keys`
- `GET/POST/PATCH/DELETE /webhooks`
- `POST /webhooks/:id/rotate-secret`
- `GET /webhooks/deliveries`
- `POST /webhooks/deliveries/:id/retry`

## Webhooks

Signed delivery headers:

- `CMP-Signature: t=<unix>,v1=<hmac>`
- `CMP-Event: <event.type>`

HMAC: `SHA256(secret, `${timestamp}.${rawBody}`)`

Events emitted (MVP):

- `scan.started`, `scan.completed`, `scan.failed`
- `consent.created`, `consent.updated`, `consent.withdrawn`
- `policy.published`

Retries: 3 attempts with 0s / 30s / 5min delays.

## Admin

- **Developers** page: API keys, webhook endpoints, delivery history

## OpenAPI

Swagger UI: `/docs` (includes API key auth scheme)

## Docs

- [Developer API guide](DEVELOPER-API.md)
- [Webhooks guide](WEBHOOKS.md)
