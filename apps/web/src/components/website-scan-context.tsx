'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DOMAIN_SCAN_POLL_MS, useRunningScanPoll } from '@/hooks/use-running-scan-poll';
import { apiFetch } from '@/lib/api';

export interface WebsiteScanSummary {
  id: string;
  status: string;
  startUrl?: string;
  maxPages?: number;
  pagesScanned: number;
  progressPercent?: number;
  cookiesFound?: number;
  trackersFound?: number;
  errorMessage?: string | null;
  progressMessage?: string | null;
  durationMs?: number | null;
  completedAt: string | null;
  createdAt: string;
}

interface WebsiteScanContextValue {
  scans: WebsiteScanSummary[];
  hasRunningScan: boolean;
  runningScan: WebsiteScanSummary | undefined;
  /** Increments when a running scan finishes (completed/failed/cancelled). */
  scanEpoch: number;
  flashMessage: string;
  pollIntervalMs: number;
  refreshScans: () => Promise<void>;
  notifyScanStarted: () => void;
  clearFlash: () => void;
}

const WebsiteScanContext = createContext<WebsiteScanContextValue | null>(null);

/**
 * Single owner of GET /domains/:id/scans polling while a scan is RUNNING.
 * Child pages must read from this context — do not add more useRunningScanPoll hooks.
 */
export function WebsiteScanProvider({
  domainId,
  children,
}: {
  domainId: string;
  children: React.ReactNode;
}) {
  const [scans, setScans] = useState<WebsiteScanSummary[]>([]);
  const [flashMessage, setFlashMessage] = useState('');
  const [scanEpoch, setScanEpoch] = useState(0);

  const refreshScans = useCallback(async () => {
    const r = await apiFetch<WebsiteScanSummary[]>(`/domains/${domainId}/scans`, {
      silent: true,
    });
    if (r.data) setScans(r.data);
  }, [domainId]);

  useEffect(() => {
    void refreshScans();
  }, [refreshScans]);

  const hasRunningScan = scans.some((s) => s.status === 'RUNNING');
  const runningScan = scans.find((s) => s.status === 'RUNNING');

  const onScanFinished = useCallback(async () => {
    await refreshScans();
    setScanEpoch((n) => n + 1);
  }, [refreshScans]);

  useRunningScanPoll(hasRunningScan, refreshScans, onScanFinished);

  useEffect(() => {
    if (!flashMessage) return;
    const id = window.setTimeout(() => setFlashMessage(''), 8000);
    return () => window.clearTimeout(id);
  }, [flashMessage]);

  const notifyScanStarted = useCallback(() => {
    setFlashMessage('Scan started');
    void refreshScans();
  }, [refreshScans]);

  const clearFlash = useCallback(() => setFlashMessage(''), []);

  const value = useMemo(
    () => ({
      scans,
      hasRunningScan,
      runningScan,
      scanEpoch,
      flashMessage,
      pollIntervalMs: DOMAIN_SCAN_POLL_MS,
      refreshScans,
      notifyScanStarted,
      clearFlash,
    }),
    [
      scans,
      hasRunningScan,
      runningScan,
      scanEpoch,
      flashMessage,
      refreshScans,
      notifyScanStarted,
      clearFlash,
    ],
  );

  return (
    <WebsiteScanContext.Provider value={value}>{children}</WebsiteScanContext.Provider>
  );
}

export function useWebsiteScan() {
  return useContext(WebsiteScanContext);
}

export function WebsiteScanStatus() {
  const ctx = useWebsiteScan();
  if (!ctx) return null;

  const { hasRunningScan, runningScan, flashMessage } = ctx;
  if (!hasRunningScan && !flashMessage) return null;

  return (
    <div className="website-scan-status" role="status" aria-live="polite">
      {hasRunningScan && (
        <p className="website-scan-status-line success">
          Scan in progress
          {runningScan?.maxPages
            ? ` (${runningScan.pagesScanned ?? 0}/${runningScan.maxPages} pages)`
            : ''}
          {runningScan?.progressMessage ? ` — ${runningScan.progressMessage}` : ''}
        </p>
      )}
      {flashMessage && <p className="website-scan-status-line success">{flashMessage}</p>}
    </div>
  );
}
