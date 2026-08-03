# Consent Management Platform — Implementation Documentation

This folder contains the phased implementation plan and sprint backlog for the Consent Management Platform (CMP), derived from the product implementation specification.

## Product Objective

Build a multi-tenant Consent Management Platform that:

- Scans websites for cookies, trackers and storage technologies
- Displays legally appropriate consent banners
- Blocks non-essential tracking until consent is available
- Stores verifiable consent records
- Communicates consent to Google and other advertising platforms
- Supports multiple domains, regions, languages and privacy regulations
- Provides reports, integrations and automated compliance monitoring

## Documentation Index

### Phases (20)

| Phase | Document | Primary Sprint(s) |
|-------|----------|-------------------|
| 1 | [Product Foundation](phases/phase-01-product-foundation.md) | Sprint 1 |
| 2 | [Organization and Domain Management](phases/phase-02-organization-and-domain-management.md) | Sprint 2 |
| 3 | [Consent Data Model](phases/phase-03-consent-data-model.md) | Sprint 3 |
| 4 | [Consent Banner](phases/phase-04-consent-banner.md) | Sprint 4, 14 |
| 5 | [Client-Side Consent SDK](phases/phase-05-client-side-consent-sdk.md) | Sprint 5 |
| 6 | [Consent Collection and Audit Evidence](phases/phase-06-consent-collection-and-audit-evidence.md) | Sprint 6 |
| 7 | [Script and Tracker Blocking](phases/phase-07-script-and-tracker-blocking.md) | Sprint 7, 10 |
| 8 | [Website Scanner](phases/phase-08-website-scanner.md) | Sprint 8 |
| 9 | [Cookie and Tracker Repository](phases/phase-09-cookie-and-tracker-repository.md) | Sprint 9 |
| 10 | [Preference Center](phases/phase-10-preference-center.md) | Sprint 5 |
| 11 | [Geographic and Regulatory Rules](phases/phase-11-geographic-and-regulatory-rules.md) | Sprint 12 |
| 12 | [Google Consent Mode](phases/phase-12-google-consent-mode.md) | Sprint 11 |
| 13 | [External Consent Integrations](phases/phase-13-external-consent-integrations.md) | Sprint 11, 16 |
| 14 | [Multi-Language](phases/phase-14-multi-language.md) | Sprint 14 |
| 15 | [Administration Dashboard](phases/phase-15-administration-dashboard.md) | Sprint 13 |
| 16 | [Reports and Exports](phases/phase-16-reports-and-exports.md) | Sprint 13 |
| 17 | [Developer Tools and APIs](phases/phase-17-developer-tools-and-apis.md) | Sprint 15 |
| 18 | [WordPress and CMS Integrations](phases/phase-18-wordpress-and-cms-integrations.md) | Sprint 16 |
| 19 | [Team and Enterprise Features](phases/phase-19-team-and-enterprise-features.md) | Sprint 17 |
| 20 | [AI and Differentiating Features](phases/phase-20-ai-and-differentiating-features.md) | Sprint 18 |

### Sprints (18)

| Sprint | Document | Release |
|--------|----------|---------|
| 1 | [Foundation](sprints/sprint-01-foundation.md) | MVP |
| 2 | [Domains](sprints/sprint-02-domains.md) | MVP |
| 3 | [Consent Configuration](sprints/sprint-03-consent-configuration.md) | MVP |
| 4 | [Banner MVP](sprints/sprint-04-banner-mvp.md) | MVP |
| 5 | [Consent SDK](sprints/sprint-05-consent-sdk.md) | MVP |
| 6 | [Consent Logging](sprints/sprint-06-consent-logging.md) | MVP |
| 7 | [Manual Blocking](sprints/sprint-07-manual-blocking.md) | MVP |
| 8 | [Scanner MVP](sprints/sprint-08-scanner-mvp.md) | MVP |
| 9 | [Cookie Repository](sprints/sprint-09-cookie-repository.md) | MVP |
| 10 | [Automatic Blocking](sprints/sprint-10-automatic-blocking.md) | MVP |
| 11 | [Google Consent Mode](sprints/sprint-11-google-consent-mode.md) | MVP |
| 12 | [Geo and Regulations](sprints/sprint-12-geo-and-regulations.md) | MVP |
| 13 | [Dashboard and Reports](sprints/sprint-13-dashboard-and-reports.md) | MVP |
| 14 | [Languages and Branding](sprints/sprint-14-languages-and-branding.md) | MVP |
| 15 | [APIs and Webhooks](sprints/sprint-15-apis-and-webhooks.md) | Growth |
| 16 | [WordPress and GTM](sprints/sprint-16-wordpress-and-gtm.md) | MVP |
| 17 | [Enterprise](sprints/sprint-17-enterprise.md) | Enterprise |
| 18 | [AI Features](sprints/sprint-18-ai-features.md) | AI and Automation |

### Supporting Documents

- [MVP Release Scope](mvp-release-scope.md)
- [Post-MVP Features](post-mvp-features.md)
- [Project Hierarchy (Zoho Sprints)](project-hierarchy.md)
- [Definition of Done](definition-of-done.md)

## Release Roadmap

```
MVP (Sprints 1–14, 16) → Growth (Sprint 15) → Enterprise (Sprint 17) → AI and Automation (Sprint 18)
```
