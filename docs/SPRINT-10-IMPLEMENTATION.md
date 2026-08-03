# Sprint 10 — Automatic Blocking Implementation

**Status:** Complete

## SDK (`packages/sdk/src/blocking/`)

`AutomaticBlockingController` replaces manual-only blocking when `autoBlocking` is enabled:

| Layer | Intercepts |
|-------|------------|
| DOM | `createElement`, `appendChild`, `insertBefore`, `document.write`, script/iframe/img `src` |
| Network | `fetch`, `XMLHttpRequest`, `navigator.sendBeacon` |
| Manual scan | Existing script/iframe/pixel pass (Sprint 7) |

### Rules engine (`engine-rules.ts`)

- Category `scriptMappings` + built-in tracker patterns + `vendorPatterns` from config
- Resource types: script, iframe, pixel, fetch, xhr, beacon, image
- Actions: block, allow, log
- Confidence via pattern match type

### Debugger (`debugger.ts`)

- Overlay when domain `debugMode` is true
- Shows blocked resources, matched rule, category, remediation hint

### Violation reporting

- Batched `POST /public/cmp/violations` from SDK
- Heartbeat includes `preConsentViolations` count after init

## Backend

- `blocking_violations` table
- Public `POST /public/cmp/violations`
- `GET /domains/:domainId/blocking/violations`
- `GET /domains/:domainId/blocking/rules`
- Public config includes `vendorPatterns` from master cookie definitions
- Installation validator: pre-consent violations check

## Admin UI

- `/domains/[id]/blocking` — rules summary + violation log
- Enable **Debug mode** on domain settings for on-site blocking debugger

## Tests

- `engine-rules.spec.ts` (SDK)
- API tests still passing

## Exit criteria

- Non-essential trackers blocked automatically before consent
- Rules engine supports multiple match types and actions
- Debugger shows blocked resources with remediation guidance
