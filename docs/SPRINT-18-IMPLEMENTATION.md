# Sprint 18 — AI Features Implementation

## Overview

Sprint 18 adds AI-assisted compliance tooling using **heuristic classification** (no external LLM required). Suggestions flow through an approval workflow before changes are applied to cookies.

## Database

- **Migration:** `20260803210000_sprint18_ai`
- **Models:** `AiSuggestion`, `RegressionTestRun`
- **Suggestion types:** `COOKIE_CLASSIFICATION`, `COOKIE_DESCRIPTION`, `COMPLIANCE_RECOMMENDATION`, `BANNER_TEXT`, `MISCLASSIFIED_NECESSARY`

## API (`/ai`, `/domains/:domainId/ai/*`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/domains/:domainId/ai/suggestions` | `cookie.manage` |
| POST | `/domains/:domainId/ai/cookies/:cookieId/classify` | `cookie.manage` |
| POST | `/domains/:domainId/ai/cookies/:cookieId/describe` | `cookie.manage` |
| POST | `/domains/:domainId/ai/compliance-recommendations` | `consent.view` |
| POST | `/domains/:domainId/ai/banner-text` | `banner.configure` |
| POST | `/domains/:domainId/ai/misclassified-check` | `cookie.manage` |
| POST | `/ai/suggestions/:suggestionId/approve` | `cookie.manage` |
| POST | `/ai/suggestions/:suggestionId/reject` | `cookie.manage` |
| POST | `/domains/:domainId/ai/regression/run` | `scan.view` |
| GET | `/domains/:domainId/ai/regression/runs` | `scan.view` |

## Heuristics (`@cmp/utils`)

- `classifyCookieHeuristic` — pattern-based classification (GA, Meta, Cloudflare, session, CMP, Google Ads)
- `isSuspiciousNecessaryClassification` — flags marketing/analytics names marked strictly necessary
- `generateBannerTextHeuristic` — regulation/tone-aware banner copy

## Admin UI

- **Route:** `/domains/[id]/ai`
- Tabs: Suggestions, Recommendations (generate actions), Regression runs
- Linked from domain detail and cookie repository pages

## Approval workflow

- Cookie classification/description suggestions: **Apply** updates `domain_cookies` and sets `reviewStatus` to `APPROVED`
- Compliance, banner text, misclassification reports: stored as suggestions for review (banner text not auto-applied to policy yet)

## Regression tests

Heuristic scenarios based on domain/SDK heartbeat state:

- Fresh visitor / SDK heartbeat
- Published banner policy
- Google Consent Mode default/update
- Auto-blocking
- Pre-consent violations
- Production domain verification

## Future (optional)

- `OPENAI_API_KEY` or other LLM provider for richer classifications
- Auto-apply approved banner text to draft policy version

## Apply migration

```bash
pnpm --filter @cmp/database exec prisma generate
pnpm db:migrate:deploy
```
