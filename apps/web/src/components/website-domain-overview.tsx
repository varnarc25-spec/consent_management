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
  /** Horizontal strip for page top */
  variant?: 'card' | 'strip';
}

export function WebsiteDomainOverview({
  domainId,
  hostname,
  scanFrequency,
  nextScanAt,
  variant = 'card',
}: WebsiteDomainOverviewProps) {
  const websiteScan = useWebsiteScan();
  const scans = websiteScan?.scans ?? [];
  const hasRunningScan = Boolean(websiteScan?.hasRunningScan);
  const runningScan = websiteScan?.runningScan;

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

  const statusValue = hasRunningScan
    ? 'Running…'
    : lastCompletedScan
      ? lastCompletedScan.status
      : '—';

  const lastScanValue = lastCompletedScan?.completedAt
    ? formatScanDate(lastCompletedScan.completedAt)
    : hasRunningScan
      ? 'Running…'
      : '—';

  const nextScanValue =
    nextScanAt && scanFrequency !== 'MANUAL' ? formatScanDate(nextScanAt) : 'Not scheduled';

  const subpagesValue = lastCompletedScan?.pagesScanned ?? runningScan?.pagesScanned ?? 0;

  if (variant === 'strip') {
    return (
      <section className="website-overview-strip" aria-label="Website overview">
        <div className="website-overview-strip-item">
          <span className="website-overview-strip-label">Status</span>
          <span className="website-overview-strip-value">{statusValue}</span>
        </div>
        <div className="website-overview-strip-item">
          <span className="website-overview-strip-label">Last scan</span>
          <span className="website-overview-strip-value">{lastScanValue}</span>
        </div>
        <div className="website-overview-strip-item">
          <span className="website-overview-strip-label">Next scan</span>
          <span className="website-overview-strip-value">{nextScanValue}</span>
        </div>
        <div className="website-overview-strip-item">
          <span className="website-overview-strip-label">Subpages</span>
          <span className="website-overview-strip-value">
            {subpagesValue}
            {lastCompletedScan && (
              <>
                {' '}
                <button
                  className="btn-link"
                  type="button"
                  onClick={() => downloadPagesCsv(lastCompletedScan.id)}
                >
                  CSV
                </button>
              </>
            )}
          </span>
        </div>
        {lastCompletedScan?.errorMessage && (
          <p className="error website-overview-strip-error">{lastCompletedScan.errorMessage}</p>
        )}
      </section>
    );
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
              <span className="domain-stat-value">{lastScanValue}</span>
            </div>
            <div className="domain-stat-row">
              <span className="domain-stat-label">Next scan</span>
              <span className="domain-stat-value">{nextScanValue}</span>
            </div>
            {lastCompletedScan?.errorMessage && (
              <p className="error" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                {lastCompletedScan.errorMessage}
              </p>
            )}
            <div className="domain-stat-row">
              <span className="domain-stat-label">Subpages</span>
              <span className="domain-stat-value">
                {subpagesValue}
                {lastCompletedScan && (
                  <>
                    {' '}
                    <button
                      className="btn-link"
                      type="button"
                      onClick={() => downloadPagesCsv(lastCompletedScan.id)}
                    >
                      CSV
                    </button>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
