-- Sprint 6: immutable consent audit fields on consent_submissions
CREATE TYPE "consent_event_type" AS ENUM (
  'INITIAL_CONSENT',
  'CONSENT_UPDATE',
  'CONSENT_WITHDRAWAL',
  'CONSENT_RENEWAL',
  'POLICY_RENEWAL',
  'CONSENT_EXPIRATION',
  'ADMIN_INVALIDATION'
);

CREATE TYPE "consent_status" AS ENUM ('GRANTED', 'PARTIAL', 'REJECTED', 'WITHDRAWN');

ALTER TABLE "consent_submissions" ADD COLUMN "authenticated_user_id" UUID;
ALTER TABLE "consent_submissions" ADD COLUMN "banner_version" INTEGER;
ALTER TABLE "consent_submissions" ADD COLUMN "vendors" JSONB;
ALTER TABLE "consent_submissions" ADD COLUMN "regulation" TEXT;
ALTER TABLE "consent_submissions" ADD COLUMN "event_type" "consent_event_type" NOT NULL DEFAULT 'INITIAL_CONSENT';
ALTER TABLE "consent_submissions" ADD COLUMN "consent_status" "consent_status" NOT NULL DEFAULT 'PARTIAL';
ALTER TABLE "consent_submissions" ADD COLUMN "proof_hash" TEXT;
ALTER TABLE "consent_submissions" ADD COLUMN "policy_snapshot_hash" TEXT;
ALTER TABLE "consent_submissions" ADD COLUMN "previous_record_id" UUID;
ALTER TABLE "consent_submissions" ADD COLUMN "ip_address_hash" TEXT;

-- Backfill proof_hash for existing Sprint 5 rows
UPDATE "consent_submissions"
SET "proof_hash" = "checksum"
WHERE "proof_hash" IS NULL;

ALTER TABLE "consent_submissions" ALTER COLUMN "proof_hash" SET NOT NULL;

CREATE INDEX "consent_submissions_organization_id_created_at_idx" ON "consent_submissions"("organization_id", "created_at");
CREATE INDEX "consent_submissions_proof_hash_idx" ON "consent_submissions"("proof_hash");
