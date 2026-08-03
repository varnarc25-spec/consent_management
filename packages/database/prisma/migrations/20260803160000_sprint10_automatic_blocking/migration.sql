-- Sprint 10: Automatic blocking violations

CREATE TABLE "blocking_violations" (
  "id" UUID NOT NULL,
  "domain_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "category" TEXT,
  "vendor" TEXT,
  "rule_pattern" TEXT,
  "page_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blocking_violations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blocking_violations_domain_id_created_at_idx" ON "blocking_violations"("domain_id", "created_at");

ALTER TABLE "blocking_violations" ADD CONSTRAINT "blocking_violations_domain_id_fkey"
  FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
