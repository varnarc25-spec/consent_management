-- Index for scheduled scan lookup (scan_frequency + next_scan_at)

CREATE INDEX IF NOT EXISTS "domains_scan_frequency_next_scan_at_idx"
  ON "domains"("scan_frequency", "next_scan_at");
