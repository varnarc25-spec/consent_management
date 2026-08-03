-- Sprint 6 gap closure: policy snapshot + IP storage setting
ALTER TABLE "organizations" ADD COLUMN "store_consent_ip_address" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "consent_submissions" ADD COLUMN "policy_snapshot" JSONB;
