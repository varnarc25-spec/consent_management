# Sprint 17 — Enterprise

## Database

Migration: `20260803200000_sprint17_enterprise`

- Organization: `white_label`, `sso_config`, `retention_policy`, `data_residency_region`
- `domain_groups`, `domain_group_members` — cross-domain consent
- `organization_custom_roles`, `user_custom_roles` — custom permissions
- `user_domain_access` — domain-level permissions
- `consent_submissions.group_visitor_id` — cross-domain lookup index

## API (`/enterprise`)

| Endpoint | Description |
|----------|-------------|
| `GET /settings` | Combined enterprise settings |
| `PATCH /white-label` | Logo, colors, CMP branding |
| `PATCH /sso` | OIDC/SAML via Auth0 connection |
| `PATCH /retention` | Consent and audit retention |
| `PATCH /data-residency` | Region label |
| `POST /retention/run` | Manual retention job |
| CRUD `/domain-groups` | Cross-domain groups |
| CRUD `/custom-roles` | Custom role definitions |
| `POST /custom-roles/assign` | Assign custom role to user |
| `PUT /user-domain-access` | Domain-scoped permissions |

## Public CMP

- Config includes `crossDomainGroup` and `whiteLabel`
- `POST /public/cmp/consent/group-sync` — sync consent across group domains
- Consent submissions store `groupVisitorId`

## SDK

- On init, calls group-sync when `crossDomainGroup.shareConsent` is true
- Applies synced consent before local restore

## SSO

- `GET /auth/sso/start?org=org-slug` — returns Auth0 connection name and admin login hint
- Configure connection in Enterprise → SSO tab

## Admin UI

- `/enterprise` — tabs: White-label, SSO, Retention, Domain groups, Custom roles

## Retention scheduler

- Hourly job deletes consent/audit records per organization policy
- Manual trigger via `POST /enterprise/retention/run`

## Infrastructure notes

See `docs/ENTERPRISE-INFRA.md` for encryption, backup, and DR guidance.
