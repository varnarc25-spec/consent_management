-- Sprint 9: Cookie repository

CREATE TYPE "cookie_review_status" AS ENUM ('PENDING', 'AUTO_MATCHED', 'APPROVED', 'REJECTED');
CREATE TYPE "cookie_match_method" AS ENUM (
  'EXACT',
  'PREFIX',
  'SUFFIX',
  'REGEX',
  'PROVIDER_DOMAIN',
  'SCRIPT_SOURCE',
  'NETWORK_ENDPOINT',
  'VENDOR_SIGNATURE',
  'MANUAL'
);
CREATE TYPE "cookie_risk_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "cookie_definitions" (
  "id" UUID NOT NULL,
  "organization_id" UUID,
  "cookie_name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_domain" TEXT,
  "description" TEXT,
  "purpose" TEXT,
  "category" TEXT NOT NULL,
  "duration" TEXT,
  "data_collected" TEXT,
  "is_third_party" BOOLEAN NOT NULL DEFAULT false,
  "privacy_policy_url" TEXT,
  "risk_level" "cookie_risk_level" NOT NULL DEFAULT 'MEDIUM',
  "aliases" JSONB,
  "detection_patterns" JSONB NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cookie_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domain_cookies" (
  "id" UUID NOT NULL,
  "domain_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "cookie_key" TEXT NOT NULL,
  "cookie_name" TEXT NOT NULL,
  "cookie_domain" TEXT,
  "provider" TEXT,
  "provider_domain" TEXT,
  "description" TEXT,
  "purpose" TEXT,
  "category" TEXT,
  "duration" TEXT,
  "data_collected" TEXT,
  "is_third_party" BOOLEAN,
  "privacy_policy_url" TEXT,
  "risk_level" "cookie_risk_level",
  "cookie_definition_id" UUID,
  "match_method" "cookie_match_method",
  "match_confidence" INTEGER,
  "review_status" "cookie_review_status" NOT NULL DEFAULT 'PENDING',
  "first_seen_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "last_scan_id" UUID,
  "seen_count" INTEGER NOT NULL DEFAULT 1,
  "expires_at" TIMESTAMP(3),
  "found_before_consent" BOOLEAN NOT NULL DEFAULT false,
  "source_url" TEXT,
  "metadata" JSONB,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "domain_cookies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cookie_definitions_organization_id_idx" ON "cookie_definitions"("organization_id");
CREATE INDEX "cookie_definitions_cookie_name_idx" ON "cookie_definitions"("cookie_name");
CREATE INDEX "domain_cookies_domain_id_review_status_idx" ON "domain_cookies"("domain_id", "review_status");
CREATE INDEX "domain_cookies_organization_id_idx" ON "domain_cookies"("organization_id");
CREATE UNIQUE INDEX "domain_cookies_domain_id_cookie_key_key" ON "domain_cookies"("domain_id", "cookie_key");

ALTER TABLE "domain_cookies" ADD CONSTRAINT "domain_cookies_domain_id_fkey"
  FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "domain_cookies" ADD CONSTRAINT "domain_cookies_cookie_definition_id_fkey"
  FOREIGN KEY ("cookie_definition_id") REFERENCES "cookie_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
