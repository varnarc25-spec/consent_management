# Sprint 18 — AI Features

**Release:** AI and Automation  
**Phase:** [Phase 20 — AI and Differentiating Features](../phases/phase-20-ai-and-differentiating-features.md)

## Goal

Add AI-assisted compliance tools including cookie classification, recommendations, banner text generation, and automated regression testing.

## Deliverables

- AI cookie classification
- AI descriptions
- Compliance recommendations
- Banner-text generation
- Automated regression testing

## User Stories

| Story | Title |
|-------|-------|
| 13.4 | Add AI-Assisted Classification |
| 31.1 | Generate Compliance Recommendations |
| 31.2 | Generate Cookie Descriptions |
| 31.3 | Detect Misclassified Necessary Cookies |
| 31.4 | Generate Banner Text |
| 31.5 | Automated Regression Testing |

## Tasks

### AI Services
- [x] Cookie classification model (provider, category, purpose, risk)
- [x] Cookie description generator (technical + visitor-friendly)
- [x] Misclassified necessary cookie detector
- [x] Banner text generator (regulation, industry, tone, language)
- [x] Compliance recommendation engine

### Backend
- [x] AI suggestion API with confidence scores and evidence
- [x] Approval workflow for AI suggestions
- [x] Decision history for AI classifications

### Testing
- [x] Automated regression test suite (visitor scenarios)
- [x] Google Consent Mode validation in regression
- [x] Tracker-blocking validation in regression

### Frontend
- [x] AI suggestion review UI
- [x] Compliance recommendations dashboard
- [x] Regression test results view

## Dependencies

- Sprint 9 — Cookie Repository (classification workflow)
- Sprint 8 — Scanner MVP (scan results as AI input)
- Sprint 13 — Dashboard (recommendations display)

## Exit Criteria

- AI suggests cookie classifications requiring admin approval
- Compliance recommendations are generated from scan and config data
- Automated regression tests cover all major consent scenarios

## Definition of Done

See [Definition of Done](../definition-of-done.md).
