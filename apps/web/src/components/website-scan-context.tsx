'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRunningScanPoll } from '@/hooks/use-running-scan-poll';
import { apiFetch } from '@/lib/api';

interface ScanSummary {
  id: string;
  status: string;
  pagesScanned: number;
  maxPages?: number;
  completedAt: string | null;
  createdAt: string;
}

interface WebsiteScanContextValue {
  hasRunningScan: boolean;
  runningScan: ScanSummary | undefined;
  flashMessage: string;
  notifyScanStarted: () => void;
  clearFlash: () => void;
}

const WebsiteScanContext = createContext<WebsiteScanContextValue | null>(null);

export function WebsiteScanProvider({
  domainId,
  children,
}: {
  domainId: string;
  children: React.ReactNode;
}) {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [flashMessage, setFlashMessage] = useState('');

  const loadScans = useCallback(async () => {
    const r = await apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`, { silent: true });
    if (r.data) setScans(r.data);
  }, [domainId]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const hasRunningScan = scans.some((s) => s.status === 'RUNNING');
  const runningScan = scans.find((s) => s.status === 'RUNNING');

  useRunningScanPoll(hasRunningScan, loadScans, loadScans);

  useEffect(() => {
    if (!flashMessage) return;
    const id = window.setTimeout(() => setFlashMessage(''), 8000);
    return () => window.clearTimeout(id);
  }, [flashMessage]);

  const notifyScanStarted = useCallback(() => {
    setFlashMessage('Scan started');
    void loadScans();
  }, [loadScans]);

  const clearFlash = useCallback(() => setFlashMessage(''), []);

  const value = useMemo(
    () => ({
      hasRunningScan,
      runningScan,
      flashMessage,
      notifyScanStarted,
      clearFlash,
    }),
    [hasRunningScan, runningScan, flashMessage, notifyScanStarted, clearFlash],
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
        </p>
      )}
      {flashMessage && <p className="website-scan-status-line success">{flashMessage}</p>}
    </div>
  );
}
