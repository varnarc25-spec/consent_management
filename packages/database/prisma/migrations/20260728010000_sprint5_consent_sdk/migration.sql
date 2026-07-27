-- Sprint 5: consent submissions from public SDK
CREATE TABLE "consent_submissions" (
    "id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "policy_version_id" UUID,
    "config_version" INTEGER NOT NULL,
    "categories" JSONB NOT NULL,
    "region" TEXT,
    "language" TEXT,
    "collection_method" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_submissions_domain_id_visitor_id_idx" ON "consent_submissions"("domain_id", "visitor_id");
CREATE INDEX "consent_submissions_domain_id_created_at_idx" ON "consent_submissions"("domain_id", "created_at");

ALTER TABLE "consent_submissions" ADD CONSTRAINT "consent_submissions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
