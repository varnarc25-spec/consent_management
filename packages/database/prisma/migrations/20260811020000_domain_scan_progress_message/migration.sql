-- Live scanner stage text shown in the UI while a scan is RUNNING.
ALTER TABLE "domain_scans" ADD COLUMN IF NOT EXISTS "progress_message" TEXT;
