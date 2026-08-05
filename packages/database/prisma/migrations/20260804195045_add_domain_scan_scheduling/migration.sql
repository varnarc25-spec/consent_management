-- Domain scan scheduling (scan_frequency + next_scan_at)

DO $$ BEGIN
  CREATE TYPE "scan_frequency_type" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "next_scan_at" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "domains" ADD COLUMN "scan_frequency" "scan_frequency_type" NOT NULL DEFAULT 'MANUAL';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Align consent_submissions index with schema (domain_id, visitor_id, created_at)
DROP INDEX IF EXISTS "consent_submissions_domain_id_visitor_id_idx";
CREATE INDEX IF NOT EXISTS "consent_submissions_domain_id_visitor_id_created_at_idx"
  ON "consent_submissions"("domain_id", "visitor_id", "created_at");
