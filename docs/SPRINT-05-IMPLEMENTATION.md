# Sprint 5 — Consent SDK Implementation

**Status:** Complete

## SDK (`@cmp/sdk`)

### Configuration loader
- Async config fetch from `GET /api/v1/public/cmp/config/:domainKey`
- Region detection via domain config, browser locale, and timezone
- Safe failure when config is invalid or domain unverified

### Consent State API (`window.CMP` / `window.__CMP__`)
- `getConsent()`
- `setConsent(categories)`
- `acceptAll()`
- `rejectAll()`
- `openPreferences()`
- `withdrawConsent()`
- `hasConsent(category)`
- `getPolicyVersion()` via SDK instance
- `getVisitorId()`
- `onConsentReady(listener)`
- `onConsentChanged(listener)`
- `showBanner()` / `hideBanner()`

### Visitor identity
- First-party anonymous visitor ID (`v_*`)
- 365-day expiration with automatic rotation
- Stored in localStorage with cookie fallback

### Local storage
- Consent persisted in localStorage
- Cookie fallback when localStorage is blocked
- Stores categories, policy version, region, language, checksum, expiration

### Events
- `cmp:ready` — config loaded
- `cmp:consent-update` — consent changed
- Listener APIs for ready/changed callbacks

### Privacy trigger (Story 14.1)
- Floating icon (bottom-left / bottom-right)
- Footer link via CSS selector
- Custom elements with `data-cmp-open`
- API-only mode (`openPreferences()`)

## Backend

- `GET /api/v1/public/cmp/config/:domainKey` — CDN cache headers (`Cache-Control`, `ETag`)
- `POST /api/v1/public/cmp/consent` — consent submission with checksum verification
- `GET /api/v1/public/cmp/consent/:domainKey/:visitorId` — server-side consent lookup
- `consent_submissions` table for Sprint 5 records (Sprint 6 extends with full audit)

## Admin

- Privacy trigger settings on banner editor (mode, label, position, footer selector)

## Tests

- `consent-api.spec.ts` — visitor ID, storage, persistence, checksum
- `banner.spec.ts`, `gpc.spec.ts`, `a11y.spec.ts`
- `e2e/banner.browser.spec.ts` — cross-browser rendering

## Exit criteria

- SDK loads asynchronously without blocking the page
- Consent state persists across page navigation
- Visitors can reopen preferences via privacy trigger or API
