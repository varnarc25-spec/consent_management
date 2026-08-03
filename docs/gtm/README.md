# Google Tag Manager integration

This guide covers wiring the CMP with Google Tag Manager (GTM) and Consent Mode v2.

## Prerequisites

1. CMP script is the **first** script in `<head>` (before GTM container snippet).
2. Google Consent Mode is enabled in **Consent → Policy** for the domain.
3. Policy with `regulationConfig.googleConsentMode` is **published**.

## Recommended page load order

```html
<head>
  <!-- 1. CMP (loads config, applies consent default, enables blocking) -->
  <script
    src="https://cmp.example.com/sdk.js"
    data-domain-key="YOUR_DOMAIN_KEY"
    async
  ></script>

  <!-- 2. GTM container (after CMP default consent) -->
  <script>
    (function(w,d,s,l,i){...})(window,document,'script','dataLayer','GTM-XXXX');
  </script>
</head>
```

The SDK calls `gtag('consent', 'default', …)` before your tags run when GCM is enabled.

## Data layer events

The SDK pushes these events for GTM triggers:

| Event | When | Payload |
|-------|------|---------|
| `cmp_consent_default` | After default consent is applied | `cmp_consent_signals`, `cmp_consent_mode` |
| `cmp_consent_update` | After visitor accepts/rejects/saves preferences | `cmp_consent_signals`, `cmp_consent_mode` |

Example data layer push:

```js
{
  event: 'cmp_consent_update',
  cmp_consent_mode: 'advanced',
  cmp_consent_signals: {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted'
  }
}
```

A DOM event `cmp:google-consent-update` is also dispatched with the same signals in `event.detail`.

## GTM trigger setup

1. **Consent Initialization** — Use Google's built-in consent initialization (GTM reads `gtag consent` calls). Ensure CMP runs before the container loads.
2. **Custom event trigger** — Create a trigger on event name `cmp_consent_update` to fire tags when consent changes.
3. **Tag consent settings** — For each tag, set required consent types (e.g. Analytics → `analytics_storage`).

## Preview mode diagnostics

In GTM Preview:

1. Open the **Consent** tab to see current consent state.
2. Confirm `analytics_storage` / `ad_storage` are **denied** on first load (advanced mode).
3. Interact with the CMP banner and verify consent updates and `cmp_consent_update` in the data layer.
4. On the domain **Installation** page, check **Google Consent Mode** — default applied; update appears after a visitor choice.

## Basic vs advanced mode

| Mode | Behavior |
|------|----------|
| **Advanced** | Tags load with denied defaults; limited pings until consent update |
| **Basic** | Combine with auto-blocking so tags do not load until consent |

Configure mode under **Consent → Policy → Google Consent Mode**.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Tags fire before consent | Move CMP snippet above GTM; increase `wait_for_update` (ms) in policy |
| Consent never updates in GTM | Confirm banner is published; check `cmp_consent_update` in data layer |
| Installation check FAIL | Publish policy with GCM enabled; reload site after publish |
