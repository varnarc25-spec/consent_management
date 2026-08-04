-- Domain scan scheduling (scan_frequency + next_scan_at)

CREATE TYPE "scan_frequency_type" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "domains" ADD COLUMN "next_scan_at" TIMESTAMP(3),
ADD COLUMN "scan_frequency" "scan_frequency_type" NOT NULL DEFAULT 'MANUAL';

-- Align consent_submissions index with schema (domain_id, visitor_id, created_at)
DROP INDEX IF EXISTS "consent_submissions_domain_id_visitor_id_idx";
CREATE INDEX "consent_submissions_domain_id_visitor_id_created_at_idx" ON "consent_submissions"("domain_id", "visitor_id", "created_at");
