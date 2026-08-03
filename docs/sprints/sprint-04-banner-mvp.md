# Sprint 4 — Banner MVP

**Release:** MVP  
**Phase:** [Phase 4 — Consent Banner](../phases/phase-04-consent-banner.md)  
**Implementation:** [Sprint 4 Status](../../project/docs/SPRINT-04-IMPLEMENTATION.md)

## Goal

Deliver a functional, accessible consent banner with core actions and responsive layouts.

## Deliverables

- Banner renderer
- Accept All / Reject All / Customize / Save Preferences
- Responsive layout
- Accessibility foundation

## User Stories

| Story | Title |
|-------|-------|
| 6.1 | Create Banner Layouts |
| 6.2 | Implement Banner Actions |
| 6.3 | Build Banner Content Editor |
| 6.5 | Add Banner Behavior Settings |
| 7.1 | Make the Banner Accessible |

## Tasks

### SDK
- [x] Banner renderer component (bottom bar, modal, popup)
- [x] Consent action handlers (accept, reject, customize, save)
- [x] Responsive CSS for desktop, tablet, mobile
- [x] Keyboard navigation and ARIA attributes
- [x] Focus trapping for modals

### Admin UI
- [x] Banner layout selector with live preview
- [x] Content editor (title, description, button labels)
- [x] Behavior settings (first visit, expiration, page rules)

### Testing
- [x] Accessibility audit (keyboard, screen reader)
- [x] Cross-browser banner rendering tests

## Dependencies

- Sprint 3 — Consent Configuration (categories, policy, content)

## Exit Criteria

- Banner renders on a test website with all core actions working
- Preview matches published banner
- Banner passes basic accessibility checks

## Definition of Done

See [Definition of Done](../definition-of-done.md).
