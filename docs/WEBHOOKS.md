# Webhooks

## Setup

1. Open **Admin → Developers → Webhooks**
2. Add endpoint URL and select events
3. Copy the signing secret when shown (only once)

## Payload envelope

```json
{
  "id": "evt_…",
  "type": "consent.created",
  "createdAt": "2026-08-03T12:00:00.000Z",
  "data": { … }
}
```

## Verifying signatures

```http
CMP-Signature: t=1720000000,v1=abc123…
CMP-Event: consent.created
```

Compute:

```
expected = HMAC_SHA256(secret, `${t}.${rawBody}`)
```

Reject requests when `t` is older than 5 minutes (replay protection).

## Events (MVP)

| Event | When |
|-------|------|
| `scan.started` | Scan job created |
| `scan.completed` | Scan finished successfully |
| `scan.failed` | Scan failed |
| `consent.created` | First consent for visitor |
| `consent.updated` | Consent changed |
| `consent.withdrawn` | Visitor withdrew consent |
| `policy.published` | Policy version published |

## Retries

Failed deliveries retry up to 3 times (immediate, +30s, +5min). Use **Deliveries → Retry** in admin for manual retry.

## Secret rotation

`POST /api/v1/webhooks/:id/rotate-secret` returns a new secret once.
