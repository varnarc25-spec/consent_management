'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
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
      setMessage('Scan retry started');
      await loadScans(true);
    } else {
      setError(result.error?.message ?? 'Failed to retry scan');
    }
  }

  function formatDuration(ms: number | null) {
    if (!ms) return '—';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
  }

  const hasRunningScan = scans.some((s) => s.status === 'RUNNING');

  return (
    <ProtectedLayout>
      <p>
        <Link href={`/websites/${domainId}`}>← Back to website</Link> ·{' '}
        <Link href={`/websites/${domainId}/consent`}>Consent configuration</Link>
      </p>
      <h1>Website scans</h1>
      <p style={{ color: 'var(--muted)' }}>
        Detect cookies, storage, and trackers on <strong>{domain?.hostname ?? '…'}</strong>.
      </p>

      {hasRunningScan && (
        <p className="success" role="status">
          Scan in progress — this page refreshes every few seconds.
        </p>
      )}

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Start scan</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          <strong>Homepage scan</strong> — one page with consent probing (recommended). Full site
          crawl uses up to {domain?.scanLimit ?? 10} pages.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <button
            className="btn"
            type="button"
            disabled={starting || !domain || hasRunningScan}
            onClick={startScan}
          >
            {starting ? 'Starting…' : hasRunningScan ? 'Scan running…' : 'Scan homepage'}
          </button>
          {hasRunningScan && (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={cancellingId !== null}
              onClick={() => {
                const running = scans.find((s) => s.status === 'RUNNING');
                if (running) cancelScan(running.id);
              }}
            >
              {cancellingId ? 'Stopping…' : 'Stop scan'}
            </button>
          )}
          {!hasRunningScan && domain && (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={starting || !domain}
              onClick={startFullSiteScan}
            >
              Full site scan ({domain.scanLimit} pages)
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Scan history</h3>
        {scans.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No scans yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Status</th>
                <th>Pages</th>
                <th>Cookies</th>
                <th>Trackers</th>
                <th>Duration</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td>{new Date(scan.createdAt).toLocaleString()}</td>
                  <td>
                    <code>{scan.status}</code>
                    {scan.status === 'RUNNING' && (
                      <div style={{ marginTop: '0.375rem' }}>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: 'var(--surface-muted)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${scan.progressPercent ?? 0}%`,
                              background: 'var(--primary)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {scan.pagesScanned}/{scan.maxPages} ({scan.progressPercent ?? 0}%)
                        </span>
                      </div>
                    )}
                    {scan.errorMessage && (
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: scan.status === 'FAILED' ? 'var(--danger)' : 'var(--muted)',
                          margin: '0.25rem 0 0',
                          maxWidth: '28rem',
                        }}
                      >
                        {scan.errorMessage}
                      </p>
                    )}
                  </td>
                  <td>{scan.pagesScanned}/{scan.maxPages}</td>
                  <td>{scan.cookiesFound}</td>
                  <td>{scan.trackersFound}</td>
                  <td>{formatDuration(scan.durationMs)}</td>
                  <td>
                    {scan.status === 'RUNNING' && (
                      <button
                        className="btn-link"
                        type="button"
                        disabled={cancellingId === scan.id}
                        onClick={() => cancelScan(scan.id)}
                      >
                        {cancellingId === scan.id ? 'Stopping…' : 'Stop'}
                      </button>
                    )}
                    {(scan.status === 'FAILED' || scan.status === 'CANCELLED') && (
                      <button
                        className="btn-link"
                        type="button"
                        disabled={retryingId === scan.id || hasRunningScan}
                        onClick={() => retryScan(scan.id)}
                      >
                        {retryingId === scan.id ? 'Restarting…' : 'Run again'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ProtectedLayout>
  );
}
