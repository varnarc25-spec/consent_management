-- Sprint 13: notifications and scheduled reports
CREATE TYPE "notification_severity" AS ENUM ('INFO', 'WARNING', 'ERROR');
CREATE TYPE "report_schedule_frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');
CREATE TYPE "report_type" AS ENUM ('COMPLIANCE', 'SCAN_SUMMARY', 'CONSENT_EXPORT');
CREATE TYPE "report_run_status" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "domain_id" UUID,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "notification_severity" NOT NULL DEFAULT 'INFO',
  "read_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_schedules" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "domain_id" UUID,
  "report_type" "report_type" NOT NULL,
  "frequency" "report_schedule_frequency" NOT NULL,
  "delivery_email" TEXT,
  "delivery_webhook" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_run_at" TIMESTAMP(3),
  "next_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_runs" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "schedule_id" UUID,
  "report_type" "report_type" NOT NULL,
  "status" "report_run_status" NOT NULL,
  "result_summary" JSONB,
  "delivered_to" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");
CREATE INDEX "notifications_organization_id_read_at_idx" ON "notifications"("organization_id", "read_at");
CREATE INDEX "report_schedules_organization_id_idx" ON "report_schedules"("organization_id");
CREATE INDEX "report_runs_organization_id_created_at_idx" ON "report_runs"("organization_id", "created_at");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
