# Enterprise infrastructure

Sprint 17 application features are implemented in code. These infrastructure items are operational responsibilities:

## Encryption

- **In transit:** TLS for API, admin, and CMP script delivery (configure at load balancer / Cloud Run).
- **At rest:** Enable database encryption (Neon/GCP Cloud SQL default). Store API secrets in Secret Manager.

## Key rotation

- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` on a schedule; invalidate refresh tokens after rotation.
- Rotate API keys from **Developers** page; revoke old keys after clients migrate.
- Domain `consent_sync_secret` is generated per domain group; rotate by recreating the group if compromised.

## Backup and recovery

- Use managed PostgreSQL point-in-time recovery (Neon branches, Cloud SQL backups).
- Export consent records via **Consent Logs** or scheduled `CONSENT_EXPORT` reports before major deletes.

## Disaster recovery

- Document RPO/RTO targets per `data_residency_region`.
- Test restore from backup quarterly; verify CMP script and Auth0 configuration after region failover.

## Data residency

Set **Enterprise → Retention → Data residency** (`eu`, `us`, `apac`, `global`) as the organizational label. Deploy API and database in the matching region for production workloads.
