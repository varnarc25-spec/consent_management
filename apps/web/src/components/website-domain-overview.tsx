'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunningScanPoll } from '@/hooks/use-running-scan-poll';
import { useWebsiteScan } from '@/components/website-scan-context';
import { apiFetch, getApiUrl } from '@/lib/api';

interface ScanSummary {
  id: string;
  status: string;
  pagesScanned: number;
  maxPages?: number;
  errorMessage?: string | null;
  completedAt: string | null;
  createdAt: string;
}

function formatScanDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface WebsiteDomainOverviewProps {
  domainId: string;
  hostname: string;
  scanLimit: number;
  scanFrequency: string;
  nextScanAt: string | null;
}

export function WebsiteDomainOverview({
  domainId,
  hostname,
  scanFrequency,
  nextScanAt,
}: WebsiteDomainOverviewProps) {
  const websiteScan = useWebsiteScan();
  const [scans, setScans] = useState<ScanSummary[]>([]);

  function loadScans(silent = true) {
    return apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`, { silent }).then((r) => {
      if (r.data) setScans(r.data);
      return r.data;
    });
  }

  useEffect(() => {
    loadScans(true);
  }, [domainId]);

  useEffect(() => {
    if (websiteScan?.hasRunningScan) {
      void loadScans(true);
    }
  }, [websiteScan?.hasRunningScan, domainId]);

  const hasRunningScan =
    scans.some((s) => s.status === 'RUNNING') || Boolean(websiteScan?.hasRunningScan);

  const pollScanProgress = useCallback(async () => {
    await loadScans(true);
  }, [domainId]);

  useRunningScanPoll(hasRunningScan, pollScanProgress, pollScanProgress);

  const lastCompletedScan = useMemo(
    () => scans.find((s) => s.status === 'COMPLETED'),
    [scans],
  );

  async function downloadPagesCsv(scanId: string) {
    const tokenRes = await fetch('/api/auth/access-token', { credentials: 'include' });
    const tokenJson = (await tokenRes.json()) as { accessToken?: string };
    const url = `${getApiUrl()}/domains/${domainId}/scans/${scanId}/export`;
    const res = await fetch(url, {
      headers: tokenJson.accessToken ? { Authorization: `Bearer ${tokenJson.accessToken}` } : {},
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${hostname}-scan-pages.csv`;
    a.click();
  }

  return (
    <div className="website-overview-embedded">
      <section className="website-sidebar-section">
        <h2 className="website-sidebar-section-title">Overview</h2>
        <div className="domain-panel website-sidebar-panel domain-overview-merged">
          <div className="domain-overview-status">
            <h3>Status</h3>
            <div className="domain-stat-row">
              <span className="domain-stat-label">Last scan</span>
              <span className="domain-stat-value">
                {lastCompletedScan?.completedAt
                  ? formatScanDate(lastCompletedScan.completedAt)
                  : hasRunningScan
                    ? 'Running…'
                    : '—'}
              </span>
            </div>
            <div className="domain-stat-row">
              <span className="domain-stat-label">Next scan</span>
              <span className="domain-stat-value">
                {nextScanAt && scanFrequency !== 'MANUAL'
                  ? formatScanDate(nextScanAt)
                  : 'Not scheduled'}
              </span>
            </div>
            {lastCompletedScan?.errorMessage && (
              <p className="error" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {lastCompletedScan.errorMessage}
              </p>
            )}
            {lastCompletedScan && (
              <div className="domain-stat-row">
                <span className="domain-stat-label">Subpages</span>
                <span className="domain-stat-value">
                  {lastCompletedScan.pagesScanned}{' '}
                  <button
                    className="btn-link"
                    type="button"
                    onClick={() => downloadPagesCsv(lastCompletedScan.id)}
                  >
                    CSV
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
