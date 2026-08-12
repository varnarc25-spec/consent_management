'use client';

import { useMemo } from 'react';
import { useWebsiteScan } from '@/components/website-scan-context';
import { getApiUrl } from '@/lib/api';

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
  const scans = websiteScan?.scans ?? [];
  const hasRunningScan = Boolean(websiteScan?.hasRunningScan);

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
