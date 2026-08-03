# Developer API

## Authentication

Create an API key in **Admin → Developers**. Keys are shown once at creation.

```http
Authorization: Bearer cmp_live_your_key_here
```

Sandbox keys use prefix `cmp_test_` and only access domains with `environment=sandbox`.

## Base URL

```
https://your-api-host/api/v1/developer/v1
```

## Scopes

| Scope | Access |
|-------|--------|
| `domains:read` | List/get domains |
| `domains:write` | (reserved for future write endpoints) |
| `consent:read` | Consent records |
| `scans:read` | List/get scans |
| `scans:write` | Start scans |
| `cookies:read` | Domain cookie inventory |
| `policies:read` | Policy versions |

## Pagination

List endpoints accept `page` (default 1) and `limit` (default 25, max 100).

Response shape:

```json
{
  "ok": true,
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 25, "total": 0, "hasMore": false }
  }
}
```

## Idempotency

For `POST /domains/:domainId/scans`, send:

```http
Idempotency-Key: unique-request-id
```

Repeated requests within 24 hours return the original response.

## Installation (WordPress plugin)

| Endpoint | Scope | Description |
|----------|-------|-------------|
| `GET /domains/:domainId/installation-script` | `domains:read` | CMP snippet and platform guides |
| `POST /domains/:domainId/validate-installation` | `domains:read` | Run installation validation checks |

## Errors

Structured errors match the admin API:

```json
{
  "ok": false,
  "error": { "code": "API_KEY_INVALID", "message": "Invalid API key" }
}
```

## OpenAPI

Interactive reference: `https://your-api-host/docs`
