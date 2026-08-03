# Sprint 6 — Consent Logging Implementation

**Status:** Complete (including gap closure)

## Database

Extended `consent_submissions` with immutable audit fields:

- `event_type`, `consent_status`, `proof_hash`, `policy_snapshot_hash`, `policy_snapshot`
- `previous_record_id` (append-only chain)
- `ip_address_hash` (hashed, configurable per organization)
- `regulation`, `banner_version`, `vendors`, `authenticated_user_id`

Organization setting: `store_consent_ip_address` (default true).

Records are append-only — withdrawals create new events instead of updating prior rows.

## Backend API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/consent-records` | `consent.view` |
| GET | `/consent-records/export?format=csv\|json` | `consent.export` |
| POST | `/consent-records/invalidations` | `consent.export` |
| GET | `/consent-records/:consentId` | `consent.view` |
| GET | `/consent-records/:consentId/export?format=json\|csv\|pdf` | `consent.export` |

Public SDK submission (`POST /public/cmp/consent`) stores policy snapshot, vendors, authenticated user ID, and event metadata.

### Event types automated

- `INITIAL_CONSENT` / `CONSENT_UPDATE` — from collection method
- `CONSENT_WITHDRAWAL` — withdrawal flow
- `CONSENT_RENEWAL` — when published policy `requiresRenewal`
- `CONSENT_EXPIRATION` — when re-consenting after expired prior record
- `ADMIN_INVALIDATION` — via invalidations API

## Admin UI

- `/consent-records` — search, filter, CSV/JSON export
- `/consent-records/[consentId]` — proof view with banner snapshot, vendors, history
- Proof exports: Print, PDF, CSV, JSON
- Organization settings: store hashed IP toggle

## SDK

- `setAuthenticatedUserId(userId)` on `window.CMP` / `window.__CMP__`
- Policy snapshot captured and sent with each submission
- Vendor selections derived from enabled categories
- `consent_expired` collection method when re-consenting after local expiry
- `withdrawConsent()` with optional `clearCookiesOnWithdrawal`
- Dispatches `cmp:withdrawal` custom event

## Tests

- `consent-proof.util.spec.ts` — proof hash, status derivation, renewal/expiration events

## Exit criteria

- Every consent action creates an immutable server record with proof hash and policy snapshot
- Administrators can search records, view proof-of-consent, and export PDF/CSV/JSON
- Visitors can withdraw consent with full audit trail
- IP storage is organization-configurable
