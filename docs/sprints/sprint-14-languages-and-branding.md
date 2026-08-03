# Sprint 14 — Languages and Branding

**Release:** MVP  
**Phases:** [Phase 14 — Multi-Language](../phases/phase-14-multi-language.md), [Phase 4 — Consent Banner](../phases/phase-04-consent-banner.md) (Story 6.4)

## Goal

Add multilingual support, translation management, RTL layouts, and banner theme customization.

## Deliverables

- Translation management
- Automatic translation suggestions
- RTL support
- Theme editor
- Custom CSS

## User Stories

| Story | Title |
|-------|-------|
| 19.1 | Detect Visitor Language |
| 19.2 | Provide Translation Editor |
| 19.3 | Add Automatic Translation |
| 19.4 | Support Right-to-Left Languages |
| 6.4 | Create Banner Theme Editor |

## Tasks

### Backend
- [x] Translation storage and versioning
- [x] Language detection priority logic
- [x] Automatic translation suggestion API

### Frontend (Admin)
- [x] Translation editor with missing-translation indicators
- [x] Banner theme editor (colors, fonts, logo, custom CSS)
- [x] RTL preview mode
- [x] Contrast warning system

### SDK
- [x] Language detection and content switching
- [x] RTL layout support in banner and preference center
- [x] Theme application from configuration

## Dependencies

- Sprint 4 — Banner MVP (banner renderer)
- Sprint 3 — Consent Configuration (translatable content)

## Exit Criteria

- Banner and preference center display in multiple languages
- RTL languages render correctly
- Theme editor updates preview in real time with contrast warnings

## Definition of Done

See [Definition of Done](../definition-of-done.md).
