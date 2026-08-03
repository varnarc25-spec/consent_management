# Sprint 11 — Google Consent Mode Implementation

**Status:** Complete

## SDK (`packages/sdk/src/google-consent-mode/`)

| Module | Purpose |
|--------|---------|
| `types.ts` | v2 signal types, config, diagnostics |
| `mapping.ts` | CMP categories → Google signals; region defaults |
| `google-consent-mode.ts` | `gtag('consent','default')` + `update`, data layer events |

### Integration (`cmp-sdk.ts`)

- `installDefault()` runs before consent restore and blocking init
- `update()` on every `emitConsentChanged()` (including restored consent)
- `getGoogleConsentModeDiagnostics()` exposed on SDK and `window.__CMP__`

### Data layer events

- `cmp_consent_default` — default signals applied
- `cmp_consent_update` — visitor choice applied
- DOM: `cmp:google-consent-update`

### Heartbeat fields

- `googleConsentModeDetected`, `googleConsentModeEnabled`
- `googleConsentModeDefaultApplied`, `googleConsentModeUpdateApplied`
- `googleConsentModeMode` (`basic` | `advanced`)

## Validation (`packages/validation`)

- `googleConsentModeSchema` nested in `regulationConfigSchema`
- Extended `sdkHeartbeatSchema` with GCM validator fields

## Backend

- Heartbeat handler stores GCM fields in `sdkLastHeartbeat`
- Installation check **Google Consent Mode** validates default/update ordering and disabled state

## Admin UI

- **Consent → Policy** tab: GCM form (enabled, mode, wait_for_update, ads redaction, URL passthrough)
- Saves via draft PATCH `regulationConfig.googleConsentMode`; publish to go live

## GTM

- `docs/gtm/README.md` — load order, triggers, preview diagnostics

## Tests

- `mapping.spec.ts` — category mapping and region defaults

## Verify locally

```bash
pnpm --filter @cmp/sdk test
pnpm --filter @cmp/sdk build
pnpm --filter @cmp/api build
```

Publish policy with GCM enabled, load site with CMP before GTM, check Installation page and GTM Preview consent tab.
