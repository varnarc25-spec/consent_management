# Sprint 13 — Dashboard and Reports Implementation

**Status:** Complete

## API (`apps/api/src/insights/`)

| Endpoint | Purpose |
|----------|---------|
| `GET /insights/overview` | Compliance dashboard widgets + domain health |
| `GET /insights/analytics/consent` | Aggregated consent metrics (30d default) |
| `GET /insights/analytics/scans` | Scan rollups and finding counts |
| `GET /insights/notifications` | Notification center list |
| `POST /insights/notifications/sync` | Generate alerts from domain state |
| `POST /insights/notifications/:id/read` | Mark notification read |
| `GET /insights/reports/compliance` | Compliance report JSON |
| `GET /insights/reports/scan/:scanId` | Cookie scan report JSON |
| `GET/POST /insights/report-schedules` | Schedule CRUD + manual run |

## Database

- `notifications` — compliance alerts
- `report_schedules` — scheduled report delivery
- `report_runs` — delivery history

Migration: `20260803180000_sprint13_dashboard_reports`

## Consent export extensions

- Filters: `region`, `regulation`, `policyVersionId` on list and bulk export

## Admin UI

- `/dashboard` — compliance overview widgets
- `/analytics` — consent + scan analytics
- `/reports` — generate compliance report, schedule email delivery
- `/notifications` — alert center
- Nav updated; home redirects to dashboard

## Email

- `EmailService.sendScheduledReport()` for schedule runs (logs in dev without SMTP)

## Verify

```bash
pnpm db:migrate:deploy
pnpm --filter @cmp/api build
```

Open admin **Dashboard** after logging in.
