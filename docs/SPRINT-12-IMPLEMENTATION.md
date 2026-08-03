# Sprint 12 — Geo and Regulations Implementation

**Status:** Complete

## Shared (`packages/utils/src/geo/`)

| Module | Purpose |
|--------|---------|
| `country-groups.ts` | EU, UK, US, BR, CA country group membership |
| `regulation-profiles.ts` | GDPR, UK, CCPA, US opt-out, LGPD, PIPEDA, generic profiles |
| `geo-detection.ts` | CDN header country detection, client hints, merge logic |
| `regional-rules.ts` | Rule matching, profile application, default rules seed |

## Database

- `organizations.geo_targeting_disabled` — disable server-side geo (client hints only)
- Regional rules stored in `policy_versions.regulation_config.geo` (JSON)

## API

- `GeoRegulationService` — resolves visitor geo + applies regional rules to banner/categories
- Public `GET /config/:domainKey` — CDN/client geo, merged banner, `visitorGeo`, `applicableRegulation`
- Query params: `previewCountry`, `previewProfileId`, `clientCountry`, `clientLanguage`, etc.
- Consent submission accepts `regulation` from SDK (region-resolved, not org-only)

## SDK

- Fetches config with client geo hints as query params
- Uses server-resolved `region`, `applicableRegulation`, `visitorGeo`
- Submits `regulation` on consent records
- `data-preview-country` on script tag for admin test banner
- GPC: existing reject-all when `respectGlobalPrivacyControl` (CCPA profiles enable this)

## Admin UI

- **Consent → Regional** tab: enable geo, default profile, regional rules table, save
- **Consent → Banner** preview: country selector applies profile to preview
- **Test banner**: country preview dropdown reloads SDK with `data-preview-country`
- **Organization**: default regulation, disable server geo
- **Domain settings**: default region label fallback

## Verify

```bash
pnpm install
pnpm --filter @cmp/utils test
pnpm --filter @cmp/sdk test && pnpm --filter @cmp/sdk build
pnpm --filter @cmp/api build
```

Configure regional rules, publish policy, test with country preview on test-banner page.
