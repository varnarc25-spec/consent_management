'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  function load() {
    apiFetch<Domain>(`/domains/${domainId}`).then((r) => {
      if (r.data) setDomain(r.data);
    });
    apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`).then((r) => {
      if (r.data) setScans(r.data);
    });
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [domainId]);

  async function startScan() {
    setStarting(true);
    setMessage('');
    setError('');
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: domain ? `https://${domain.hostname}/` : undefined,
        maxPages: Math.min(10, domain?.scanLimit ?? 10),
        maxDepth: 2,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStarting(false);
    if (result.ok) {
      setMessage('Scan started');
      load();
    } else {
      setError(result.error?.message ?? 'Failed to start scan');
    }
  }

  async function retryScan(scanId: string) {
    setRetryingId(scanId);
    setMessage('');
    setError('');
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans/${scanId}/retry`, {
      method: 'POST',
    });
    setRetryingId(null);
    if (result.ok) {
      setMessage('Scan retry started');
      load();
    } else {
      setError(result.error?.message ?? 'Failed to retry scan');
    }
  }

  function formatDuration(ms: number | null) {
    if (!ms) return '—';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
  }

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

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Start scan</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Runs a quick crawl (up to {Math.min(10, domain?.scanLimit ?? 10)} pages) with JavaScript rendering.
        </p>
        <button className="btn" type="button" disabled={starting || !domain} onClick={startScan}>
          {starting ? 'Starting…' : 'Start scan'}
        </button>
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
                          {scan.progressPercent ?? 0}%
                        </span>
                      </div>
                    )}
                    {scan.status === 'FAILED' && scan.errorMessage && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--danger)', margin: '0.25rem 0 0' }}>
                        {scan.errorMessage}
                      </p>
                    )}
                  </td>
                  <td>{scan.pagesScanned}/{scan.maxPages}</td>
                  <td>{scan.cookiesFound}</td>
                  <td>{scan.trackersFound}</td>
                  <td>{formatDuration(scan.durationMs)}</td>
                  <td>
                    {scan.status === 'FAILED' && (
                      <button
                        className="btn-link"
                        type="button"
                        disabled={retryingId === scan.id}
                        onClick={() => retryScan(scan.id)}
                      >
                        {retryingId === scan.id ? 'Retrying…' : 'Retry'}
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
