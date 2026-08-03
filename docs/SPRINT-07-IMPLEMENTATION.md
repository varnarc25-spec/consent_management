# Sprint 7 — Manual Blocking Implementation

**Status:** Complete

## SDK (`packages/sdk/src/blocking/`)

`ManualBlockingController` runs when `autoBlocking` is enabled on the domain:

| Mechanism | Behavior |
|-----------|----------|
| Inline scripts | `type="text/plain"`, content stored in `data-cmp-inline`, executed after consent |
| External scripts | `src` removed to `data-cmp-src`, new executable script appended on grant |
| Iframes | `src` stripped, placeholder shown with configurable copy and “Allow” → preferences |
| Tracking pixels | `img` `src` cleared until category consent |

**Category resolution order:** `data-cmp-category` → `data-cmp-vendor` → admin `scriptMappings` → built-in `KNOWN_TRACKER_PATTERNS`.

Integrated in `cmp-sdk.ts`: `initBlocking()` after consent restore, `blocking.sync()` on consent changes.

## Validation

- `categoryMappingsSchema` extended with `iframes` and `pixels`
- `bannerContentSchema.embedPlaceholders` for per-category iframe placeholder copy

## Admin UI

**Consent → Categories tab**

- Script / iframe / pixel URL pattern fields per category
- Save mappings via existing category PATCH API (`scriptMappings`)

**Consent → Banner tab**

- Embed placeholder overrides (title, description, allow button) per category

**Test banner page**

- Injects inline script, external script, YouTube iframe, and Meta pixel before SDK load
- Live blocking status (consent + inline script execution)

## Tests

- `packages/sdk/src/blocking/rules.spec.ts` — pattern matching and rule building

## Exit criteria

- Restricted scripts do not execute before consent
- Iframes show placeholders with vendor explanation
- Scripts and embeds activate after the correct category is granted
- Administrators can configure URL patterns and placeholder copy

## Configuration

Enable **Auto-blocking** on the domain settings page (`/domains/[id]`). Published policy categories and banner content feed the blocking rules and placeholders.
