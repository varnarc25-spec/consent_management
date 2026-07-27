# Sprint 4 / Phase 4 — Banner Implementation

**Status:** Complete (Phase 4 MVP scope)

## SDK (`@cmp/sdk`)

- Banner renderer with layouts: bottom bar, top bar, center modal, corner popup, fullscreen, side panel, compact, **multi-step modal**
- Actions: Accept all, Reject all, Customize, Save preferences, Back, Close (optional)
- Consent state persisted in `localStorage` with expiration and policy version checks
- Behavior: delay, scroll %, **display after interaction**, page rules, block interaction, **GPC auto-reject**
- Theme: colors, button style, font, spacing, shadow, overlay opacity, logo, scoped custom CSS
- Content: plain or basic HTML descriptions, category/vendor description overrides
- Accessibility: semantic HTML, ARIA labels, keyboard focus trap, Escape handling, visible focus, reduced motion
- Save disabled until all optional categories are reviewed in preferences view
- Built bundle served from `GET /api/v1/public/cmp/sdk.js`

## Admin UI

- Banner tab on `/domains/[id]/consent` with:
  - Layout selector (8 layouts including multi-step modal)
  - Text templates (standard, GDPR, minimal)
  - Content editor with character limits and basic HTML format
  - Category and vendor description overrides
  - Behavior settings including GPC and display-after-interaction
  - Full theme editor with contrast warnings in live preview
  - Live preview with desktop/tablet/mobile viewports
- Live banner test page at `/domains/[id]/test-banner`

## Validation

Extended `bannerContentSchema` with `contentFormat`, `categoryDescriptions`, `vendorDescriptions`, expanded `behavior` and `theme`.

## Tests

- `packages/sdk/src/banner.spec.ts` — visibility, consent state, render, customize/save, incomplete-save guard, multi-step
- `packages/sdk/src/gpc.spec.ts` — Global Privacy Control
- `packages/sdk/src/a11y.spec.ts` — focus trap and Escape
- `packages/sdk/e2e/banner.browser.spec.ts` — Playwright cross-browser render smoke tests
- `packages/utils/src/contrast.spec.ts` — WCAG contrast utilities

## Deferred to Sprint 14

- Full rich-text WYSIWYG editor
- Region/language-specific banner content and translation management
- RTL layouts
