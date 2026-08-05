'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { ScanStatusBadge } from '@/components/scans/scan-status-badge';
import { apiFetch, ensureApiSession } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  scanLimit: number;
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

export default function WebsiteScansPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const scansRef = useRef<ScanSummary[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function loadScans(silent = false) {
    return apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`, { silent }).then((r) => {
      if (r.data) {
        setScans(r.data);
        scansRef.current = r.data;
      } else if (r.error?.code === 'UNAUTHORIZED') {
        setError('Session expired. Please sign in again.');
      }
    });
  }

  async function loadInitial() {
    const domainResult = await apiFetch<Domain>(`/domains/${domainId}`);
    if (domainResult.data) {
      setDomain(domainResult.data);
    } else if (domainResult.error?.code === 'UNAUTHORIZED') {
      setError('Session expired. Please sign in again.');
    }
    await loadScans();
  }

  useEffect(() => {
    loadInitial();
    const timer = window.setInterval(() => {
      if (scansRef.current.some((s) => s.status === 'RUNNING')) {
        loadScans(true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [domainId]);

  async function startScan() {
    setStarting(true);
    setMessage('');
    setError('');
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setStarting(false);
      setError('Session expired. Please sign in again.');
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: domain ? `https://${domain.hostname}/` : undefined,
        maxPages: 1,
        maxDepth: 0,
        timeoutMs: 45000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStarting(false);
    if (result.ok) {
      setMessage('Homepage scan started');
      await loadScans(true);
    } else {
      setError(result.error?.message ?? 'Failed to start scan');
    }
  }

  async function startFullSiteScan() {
    setStarting(true);
    setMessage('');
    setError('');
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setStarting(false);
      setError('Session expired. Please sign in again.');
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: domain ? `https://${domain.hostname}/` : undefined,
        maxPages: domain?.scanLimit ?? 10,
        maxDepth: 3,
        timeoutMs: 30000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStarting(false);
    if (result.ok) {
      setMessage('Full site scan started');
      await loadScans(true);
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
      await loadScans(true);
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
      await loadScans(true);
    } else {
      setError(result.error?.message ?? 'Failed to retry scan');
    }
  }

  const hasRunningScan = scans.some((s) => s.status === 'RUNNING');
  const lastCompleted = scans.find((s) => s.status === 'COMPLETED');
  const totalScans = scans.length;
  const failedCount = scans.filter((s) => s.status === 'FAILED' || s.status === 'CANCELLED').length;

  return (
    <ProtectedLayout>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="breadcrumb-sep">/</span>
        <Link href={`/websites/${domainId}`}>{domain?.hostname ?? 'Website'}</Link>
        <span className="breadcrumb-sep">/</span>
        <span>Scans</span>
      </nav>

      <div className="page-header">
        <div>
          <h1>Website scans</h1>
          <p className="page-subtitle">
            Detect cookies, storage, and trackers on{' '}
            <strong>{domain?.hostname ?? '…'}</strong>
          </p>
        </div>
        {hasRunningScan && (
          <div className="page-toolbar">
            <button
              className="btn-ghost btn-ghost-danger"
              type="button"
              disabled={cancellingId !== null}
              onClick={() => {
                const running = scans.find((s) => s.status === 'RUNNING');
                if (running) cancelScan(running.id);
              }}
            >
              {cancellingId ? 'Stopping…' : 'Stop scan'}
            </button>
          </div>
        )}
      </div>

      {hasRunningScan && (
        <div className="alert alert-info" role="status">
          <span className="alert-icon">↻</span>
          <span>Scan in progress — this page refreshes every few seconds.</span>
        </div>
      )}

      {message && (
        <div className="alert alert-success" role="status">
          <span className="alert-icon">✓</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total scans</span>
          <span className="stat-value">{totalScans}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last cookies</span>
          <span className="stat-value">{lastCompleted?.cookiesFound ?? '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last trackers</span>
          <span className="stat-value">{lastCompleted?.trackersFound ?? '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Failed / stopped</span>
          <span className="stat-value">{failedCount}</span>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel-main">
          <div className="card">
            <div className="card-header">
              <h2>Scan history</h2>
              <span className="card-meta">{scans.length} records</span>
            </div>

            {scans.length === 0 ? (
              <p className="empty-state">No scans yet. Run a homepage scan to build your cookie inventory.</p>
            ) : (
              <div className="data-table-wrap">
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
          </div>
        </div>

        <aside className="panel-side">
          <div className="card">
            <div className="card-header">
              <h2>Start scan</h2>
            </div>
            <div className="scan-actions-grid">
              <div className="scan-action-card scan-action-card-featured">
                <h4>Homepage scan</h4>
                <p>
                  One page with full consent probing. Recommended for cookie inventory and quick
                  checks (~1 min).
                </p>
                <button
                  className="btn"
                  type="button"
                  disabled={starting || !domain || hasRunningScan}
                  onClick={startScan}
                >
                  {starting ? 'Starting…' : hasRunningScan ? 'Scan running…' : 'Scan homepage'}
                </button>
              </div>
              <div className="scan-action-card">
                <h4>Full site crawl</h4>
                <p>
                  Crawls up to {domain?.scanLimit ?? 10} pages with link discovery. Use for deep
                  audits; may take several minutes.
                </p>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={starting || !domain || hasRunningScan}
                  onClick={startFullSiteScan}
                >
                  Full site ({domain?.scanLimit ?? 10} pages)
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <h2>Quick links</h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              <Link href={`/websites/${domainId}`}>Website overview</Link>
              <br />
              <Link href={`/websites/${domainId}/consent`}>Consent configuration</Link>
            </p>
          </div>
        </aside>
      </div>
    </ProtectedLayout>
  );
}
