-- Ensure provider_domain exists on domain_cookies (idempotent for DBs that missed sprint9 migration).
ALTER TABLE "domain_cookies" ADD COLUMN IF NOT EXISTS "provider_domain" TEXT;
