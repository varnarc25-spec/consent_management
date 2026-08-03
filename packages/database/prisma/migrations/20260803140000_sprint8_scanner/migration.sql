-- Sprint 8: Website scanner MVP

CREATE TYPE "scan_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "scan_finding_type" AS ENUM (
  'COOKIE',
  'LOCAL_STORAGE',
  'SESSION_STORAGE',
  'INDEXED_DB',
  'SCRIPT',
  'IFRAME',
  'PIXEL',
  'NETWORK_REQUEST',
  'SERVICE_WORKER'
);
CREATE TYPE "scan_consent_state" AS ENUM ('BEFORE_CONSENT', 'AFTER_ACCEPT', 'AFTER_REJECT');

CREATE TABLE "domain_scans" (
  "id" UUID NOT NULL,
  "domain_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "status" "scan_status" NOT NULL DEFAULT 'PENDING',
  "start_url" TEXT NOT NULL,
  "max_pages" INTEGER NOT NULL DEFAULT 25,
  "max_depth" INTEGER NOT NULL DEFAULT 2,
  "include_paths" JSONB,
  "exclude_paths" JSONB,
  "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
  "js_rendering" BOOLEAN NOT NULL DEFAULT true,
  "device_type" TEXT NOT NULL DEFAULT 'desktop',
  "pages_scanned" INTEGER NOT NULL DEFAULT 0,
  "cookies_found" INTEGER NOT NULL DEFAULT 0,
  "trackers_found" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "domain_scans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domain_scan_pages" (
  "id" UUID NOT NULL,
  "scan_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "canonical_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ok',
  "depth" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "domain_scan_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domain_scan_findings" (
  "id" UUID NOT NULL,
  "scan_id" UUID NOT NULL,
  "page_id" UUID,
  "finding_type" "scan_finding_type" NOT NULL,
  "consent_state" "scan_consent_state" NOT NULL DEFAULT 'BEFORE_CONSENT',
  "name" TEXT NOT NULL,
  "value_sample" TEXT,
  "cookie_domain" TEXT,
  "cookie_path" TEXT,
  "expires_at" TIMESTAMP(3),
  "secure" BOOLEAN,
  "http_only" BOOLEAN,
  "same_site" TEXT,
  "is_third_party" BOOLEAN,
  "page_url" TEXT,
  "technology" TEXT,
  "source_url" TEXT,
  "metadata" JSONB,

  CONSTRAINT "domain_scan_findings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "domain_scans_domain_id_created_at_idx" ON "domain_scans"("domain_id", "created_at");
CREATE INDEX "domain_scans_organization_id_created_at_idx" ON "domain_scans"("organization_id", "created_at");
CREATE INDEX "domain_scan_pages_scan_id_idx" ON "domain_scan_pages"("scan_id");
CREATE INDEX "domain_scan_findings_scan_id_finding_type_idx" ON "domain_scan_findings"("scan_id", "finding_type");

ALTER TABLE "domain_scans" ADD CONSTRAINT "domain_scans_domain_id_fkey"
  FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "domain_scan_pages" ADD CONSTRAINT "domain_scan_pages_scan_id_fkey"
  FOREIGN KEY ("scan_id") REFERENCES "domain_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "domain_scan_findings" ADD CONSTRAINT "domain_scan_findings_scan_id_fkey"
  FOREIGN KEY ("scan_id") REFERENCES "domain_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "domain_scan_findings" ADD CONSTRAINT "domain_scan_findings_page_id_fkey"
  FOREIGN KEY ("page_id") REFERENCES "domain_scan_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
