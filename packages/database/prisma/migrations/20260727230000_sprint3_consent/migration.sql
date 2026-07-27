-- CreateEnum
CREATE TYPE "consent_category_default_state" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "policy_version_status" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "consent_categories" (
    "id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "legal_basis" TEXT,
    "default_state" "consent_category_default_state" NOT NULL DEFAULT 'DISABLED',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "external_signals" JSONB,
    "script_mappings" JSONB,
    "vendor_purposes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "policy_version_status" NOT NULL DEFAULT 'DRAFT',
    "categories_snapshot" JSONB,
    "banner_content" JSONB,
    "legal_text" JSONB,
    "regulation_config" JSONB,
    "default_consent_states" JSONB,
    "supported_languages" JSONB,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "requires_renewal" BOOLEAN NOT NULL DEFAULT false,
    "renewal_reason" JSONB,
    "change_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_renewals" (
    "id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "policy_version_id" UUID,
    "reason" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'all',
    "triggered_by" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_categories_domain_id_sort_order_idx" ON "consent_categories"("domain_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "consent_categories_domain_id_slug_key" ON "consent_categories"("domain_id", "slug");

-- CreateIndex
CREATE INDEX "policy_versions_domain_id_status_idx" ON "policy_versions"("domain_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "policy_versions_domain_id_version_number_key" ON "policy_versions"("domain_id", "version_number");

-- CreateIndex
CREATE INDEX "consent_renewals_domain_id_created_at_idx" ON "consent_renewals"("domain_id", "created_at");

-- AddForeignKey
ALTER TABLE "consent_categories" ADD CONSTRAINT "consent_categories_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_renewals" ADD CONSTRAINT "consent_renewals_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_renewals" ADD CONSTRAINT "consent_renewals_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
