'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { WebsiteDomainOverview } from '@/components/website-domain-overview';
import { WebsiteLayout } from '@/components/website-layout';
import {
  WebsiteScanStatus,
  useWebsiteScan,
} from '@/components/website-scan-context';
import { WebsiteSetupSteps } from '@/components/website-setup-steps';
import { apiFetch, ensureApiSession } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
  verificationStatus: string;
  sdkLastSeenAt: string | null;
  scanLimit: number;
  scanFrequency: string;
  nextScanAt: string | null;
}

interface ScanSummary {
  id: string;
  status: string;
  startUrl: string;
  maxPages: number;
  pagesScanned: number;
  progressPercent?: number;
  cookiesFound: number;
  trackersFound: number;
  errorMessage: string | null;
  progressMessage?: string | null;
  durationMs: number | null;
  createdAt: string;
}

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatStarted(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function WebsiteScansContent({ domain }: { domain: Domain }) {
  const domainId = domain.id;
  const websiteScan = useWebsiteScan();
  const scans = websiteScan?.scans ?? [];
  const hasRunningScan = Boolean(websiteScan?.hasRunningScan);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (websiteScan?.flashMessage) {
      setMessage(websiteScan.flashMessage);
    }
  }, [websiteScan?.flashMessage]);

  async function startScan() {
    setStarting(true);
    setMessage('');
    setError('');
    websiteScan?.clearFlash();
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setStarting(false);
      setError('Session expired. Please sign in again.');
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: `https://${domain.hostname}/`,
        maxPages: 1,
        maxDepth: 0,
        timeoutMs: 60000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStarting(false);
    if (result.ok) {
      setMessage('Homepage scan started');
      websiteScan?.notifyScanStarted();
    } else {
      setError(result.error?.message ?? 'Failed to start scan');
    }
  }

  async function startFullSiteScan() {
    setStarting(true);
    setMessage('');
    setError('');
    websiteScan?.clearFlash();
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setStarting(false);
      setError('Session expired. Please sign in again.');
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: `https://${domain.hostname}/`,
        maxPages: domain.scanLimit,
        maxDepth: 3,
        timeoutMs: 45000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStarting(false);
    if (result.ok) {
      setMessage('Full site scan started');
      websiteScan?.notifyScanStarted();
    } else {
      setError(result.error?.message ?? 'Failed to start scan');
    }
  }

  async function cancelScan(scanId: string) {
    setCancellingId(scanId);
    setMessage('');
    setError('');
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setCancellingId(null);
      setError('Session expired. Please sign in again.');
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans/${scanId}/cancel`, {
      method: 'POST',
    });
    setCancellingId(null);
    if (result.ok) {
      setMessage('Scan stopped');
      await websiteScan?.refreshScans();
    } else {
      setError(result.error?.message ?? 'Failed to stop scan');
    }
  }

  async function retryScan(scanId: string) {
    setRetryingId(scanId);
    setMessage('');
    setError('');
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setRetryingId(null);
      setError('Session expired. Please sign in again.');
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans/${scanId}/retry`, {
      method: 'POST',
    });
    setRetryingId(null);
    if (result.ok) {
      setMessage('Scan restarted');
      websiteScan?.notifyScanStarted();
    } else {
      setError(result.error?.message ?? 'Failed to retry scan');
    }
  }

  const runningScan = websiteScan?.runningScan;

  return (
    <>
      <div className="website-page-header website-page-header-end">
        <WebsiteScanStatus />
        {hasRunningScan && (
          <button
            className="btn btn-secondary"
            type="button"
            disabled={cancellingId !== null || !runningScan}
            onClick={() => {
              if (runningScan) cancelScan(runningScan.id);
            }}
          >
            {cancellingId ? 'Stopping…' : 'Stop scan'}
          </button>
        )}
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="website-setup-overview-row">
        <div className="card website-setup-card">
          <WebsiteSetupSteps
            domainId={domain.id}
            hostname={domain.hostname}
            verificationStatus={domain.verificationStatus}
            sdkLastSeenAt={domain.sdkLastSeenAt}
          />
        </div>

        <div className="card website-overview-main-card">
          <WebsiteDomainOverview
            domainId={domain.id}
            hostname={domain.hostname}
            scanLimit={domain.scanLimit}
            scanFrequency={domain.scanFrequency}
            nextScanAt={domain.nextScanAt}
          />
        </div>
      </div>

      <div className="card website-domain-merged" style={{ marginTop: '1.5rem' }}>
        <section className="website-domain-section">
          <h3>Start scan</h3>
          <div className="scan-actions-grid">
            <div className="scan-action-card scan-action-card-featured">
              <h4>Homepage scan</h4>
              <p>
                One page with full consent probing. Recommended for cookie inventory and quick
                checks (~1–3 min on Cloud Run). SDK install is not required for discovery.
              </p>
              <button
                className="btn"
                type="button"
                disabled={starting || hasRunningScan}
                onClick={startScan}
              >
                {starting ? 'Starting…' : hasRunningScan ? 'Scan running…' : 'Scan homepage'}
              </button>
            </div>
            <div className="scan-action-card">
              <h4>Full site crawl</h4>
              <p>
                Crawls up to {domain.scanLimit} pages with link discovery. Use for deep audits;
                may take several minutes.
              </p>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={starting || hasRunningScan}
                onClick={startFullSiteScan}
              >
                Full site ({domain.scanLimit} pages)
              </button>
            </div>
          </div>
        </section>

        <section className="website-domain-section" style={{ marginTop: '1.5rem' }}>
          <div className="website-install-validate-header">
            <h3>Scan history</h3>
            <span className="card-meta">{scans.length} records</span>
          </div>

          {scans.length === 0 ? (
            <p className="website-section-muted" style={{ marginTop: '1rem' }}>
              No scans yet. Run a homepage scan to build your cookie inventory.
            </p>
          ) : (
            <div className="data-table-wrap" style={{ marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Status</th>
                    <th>Pages</th>
                    <th>Cookies</th>
                    <th>Trackers</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => {
                    const pagePct =
                      scan.maxPages > 0
                        ? Math.round((scan.pagesScanned / scan.maxPages) * 100)
                        : 0;
                    return (
                      <tr key={scan.id}>
                        <td>
                          <time dateTime={scan.createdAt}>{formatStarted(scan.createdAt)}</time>
                        </td>
                        <td>
                          <ScanStatusBadge status={scan.status} />
                          {scan.status === 'RUNNING' && (
                            <>
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${scan.progressPercent ?? pagePct}%`,
                                  }}
                                />
                              </div>
                              <p className="progress-meta">
                                {scan.pagesScanned}/{scan.maxPages} pages (
                                {scan.progressPercent ?? pagePct}%)
                              </p>
                              <p className="progress-meta" style={{ marginTop: '0.25rem' }}>
                                {scan.progressMessage?.trim() ||
                                  (scan.pagesScanned === 0
                                    ? 'Working… launching browser and opening the site. 0% is normal until the first page completes (SDK not required).'
                                    : 'Processing pages…')}
                              </p>
                            </>
                          )}
                          {scan.errorMessage && (
                            <p className="table-error">{scan.errorMessage}</p>
                          )}
                        </td>
                        <td className="data-table-num">
                          {scan.pagesScanned}/{scan.maxPages}
                        </td>
                        <td className="data-table-num">{scan.cookiesFound}</td>
                        <td className="data-table-num">{scan.trackersFound}</td>
                        <td className="data-table-num">{formatDuration(scan.durationMs)}</td>
                        <td>
                          <div className="table-actions">
                            {scan.status === 'RUNNING' && (
                              <button
                                className="btn-ghost btn-ghost-danger"
                                type="button"
                                disabled={cancellingId === scan.id}
                                onClick={() => cancelScan(scan.id)}
                              >
                                {cancellingId === scan.id ? 'Stopping…' : 'Stop'}
                              </button>
                            )}
                            {(scan.status === 'FAILED' || scan.status === 'CANCELLED') && (
                              <button
                                className="btn-ghost btn-ghost-primary"
                                type="button"
                                disabled={retryingId === scan.id || hasRunningScan}
                                onClick={() => retryScan(scan.id)}
                              >
                                {retryingId === scan.id ? 'Restarting…' : 'Run again'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default function WebsiteScansPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
      const result = await apiFetch<Domain>(`/domains/${domainId}`);
      if (result.data) {
        setDomain(result.data);
      } else if (result.error?.code === 'UNAUTHORIZED') {
        setError('Session expired. Please sign in again.');
      } else {
        setError(result.error?.message ?? 'Website not found');
      }
      setLoading(false);
    }
    load();
  }, [domainId]);

  return (
    <ProtectedLayout>
      {loading ? (
        <LoadingScreen message="Loading scans…" inline />
      ) : !domain ? (
        <div className="card">
          <p className="error">{error || 'Website not found.'}</p>
        </div>
      ) : (
        <WebsiteLayout
          domainId={domainId}
          hostname={domain.hostname}
          domainKey={domain.domainKey}
          verificationStatus={domain.verificationStatus}
        >
          <WebsiteScansContent domain={domain} />
        </WebsiteLayout>
      )}
    </ProtectedLayout>
  );
}
