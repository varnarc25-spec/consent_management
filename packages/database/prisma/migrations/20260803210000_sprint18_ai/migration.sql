-- Sprint 18: AI features

CREATE TYPE "ai_suggestion_type" AS ENUM (
  'COOKIE_CLASSIFICATION',
  'COOKIE_DESCRIPTION',
  'COMPLIANCE_RECOMMENDATION',
  'BANNER_TEXT',
  'MISCLASSIFIED_NECESSARY'
);

CREATE TYPE "ai_suggestion_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED');

CREATE TABLE "ai_suggestions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "suggestion_type" "ai_suggestion_type" NOT NULL,
    "status" "ai_suggestion_status" NOT NULL DEFAULT 'PENDING',
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "confidence" DOUBLE PRECISION,
    "suggestion" JSONB NOT NULL,
    "evidence" JSONB,
    "created_by" TEXT,
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regression_test_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "overall_status" "validation_check_status" NOT NULL,
    "scenarios" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regression_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_suggestions_domain_id_status_idx" ON "ai_suggestions"("domain_id", "status");
CREATE INDEX "ai_suggestions_organization_id_created_at_idx" ON "ai_suggestions"("organization_id", "created_at");
CREATE INDEX "regression_test_runs_domain_id_created_at_idx" ON "regression_test_runs"("domain_id", "created_at");

ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "regression_test_runs" ADD CONSTRAINT "regression_test_runs_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
