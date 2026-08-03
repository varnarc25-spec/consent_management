# Sprint 16 — WordPress and GTM

## WordPress plugin

Location: `integrations/wordpress/cmp-consent-management/`

### Features

- Settings page under **Settings → CMP Consent**
- API key connection with domain picker (Developer API)
- Automatic CMP script injection via `wp_head` (priority 0)
- `data-integration="wordpress"` on script tag for dashboard diagnostics
- Shortcodes: `[cmp_cookie_declaration]`, `[cmp_privacy_trigger]`
- Scan initiation and installation validation from WP admin
- Multisite per-site settings with network admin notice
- Cache-plugin guidance in readme (early `wp_head` injection)

### Setup

1. Copy plugin to `wp-content/plugins/` and activate.
2. Create API key with `domains:read` and `scans:write` scopes.
3. Configure API base URL (e.g. `https://api.example.com/api/v1`).
4. Load domains, select site, save.

## GTM

- Community template: `docs/gtm/community-template.tpl`
- Installation guide: `docs/gtm/README.md`
- Admin installation wizard includes GTM steps and Preview diagnostics

## Admin installation wizard

- Route: `/domains/[id]/install`
- Tabs: WordPress, Google Tag Manager, Manual HTML
- Integrated validation runner

## Developer API (WordPress)

| Endpoint | Scope |
|----------|-------|
| `GET /domains/:domainId/installation-script` | `domains:read` |
| `POST /domains/:domainId/validate-installation` | `domains:read` |

## SDK

- `data-integration` attribute on CMP script → `integrationSource` in heartbeat
- Installation check: `integration_source`

## Dashboard

- Domain health table shows detected integration source (wordpress, gtm, etc.)

## Other CMS

See `docs/CMS-INTEGRATIONS.md` for Shopify, Webflow, and manual install patterns.
