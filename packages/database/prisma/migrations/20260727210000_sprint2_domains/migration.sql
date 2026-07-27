-- CreateEnum
CREATE TYPE "domain_type" AS ENUM ('ROOT', 'SUBDOMAIN', 'STAGING', 'ALIAS');

-- CreateEnum
CREATE TYPE "domain_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "domain_verification_method" AS ENUM ('DNS_TXT', 'HTML_FILE', 'META_TAG', 'CMP_SCRIPT', 'MANUAL');

-- CreateEnum
CREATE TYPE "validation_check_status" AS ENUM ('PASS', 'WARNING', 'FAIL');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "business_type" TEXT,
ADD COLUMN     "default_regulation" TEXT,
ADD COLUMN     "dpo_details" TEXT,
ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "privacy_contact" TEXT,
ADD COLUMN     "technical_contact" TEXT;

-- CreateTable
CREATE TABLE "domains" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "hostname" TEXT NOT NULL,
    "domain_key" TEXT NOT NULL,
    "domain_type" "domain_type" NOT NULL DEFAULT 'ROOT',
    "is_production" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "group_name" TEXT,
    "scan_limit" INTEGER NOT NULL DEFAULT 10,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "region" TEXT,
    "auto_blocking" BOOLEAN NOT NULL DEFAULT true,
    "debug_mode" BOOLEAN NOT NULL DEFAULT false,
    "config_version" INTEGER NOT NULL DEFAULT 1,
    "verification_status" "domain_verification_status" NOT NULL DEFAULT 'PENDING',
    "verification_method" "domain_verification_method",
    "verification_token" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "sdk_last_seen_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_validations" (
    "id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "overall_status" "validation_check_status" NOT NULL,
    "checks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installation_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "domains_domain_key_key" ON "domains"("domain_key");

-- CreateIndex
CREATE INDEX "domains_organization_id_idx" ON "domains"("organization_id");

-- CreateIndex
CREATE INDEX "domains_verification_status_idx" ON "domains"("verification_status");

-- CreateIndex
CREATE INDEX "installation_validations_domain_id_created_at_idx" ON "installation_validations"("domain_id", "created_at");

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_validations" ADD CONSTRAINT "installation_validations_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
