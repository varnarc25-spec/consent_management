'use client';

import { FormEvent, useEffect, useState } from 'react';
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
  maxDepth: number;
  pagesScanned: number;
  progressPercent?: number;
  cookiesFound: number;
  trackersFound: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

export default function DomainScansPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    startUrl: '',
    maxPages: 10,
    maxDepth: 2,
    includePaths: '',
    excludePaths: '',
    timeoutMs: 30000,
    jsRendering: true,
    deviceType: 'desktop' as 'desktop' | 'mobile',
  });

  function load() {
    apiFetch<Domain>(`/domains/${domainId}`).then((r) => {
      if (r.data) {
        setDomain(r.data);
        setForm((current) => ({
          ...current,
          startUrl: `https://${r.data!.hostname}/`,
          maxPages: Math.min(current.maxPages, r.data!.scanLimit),
        }));
      }
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

  async function startScan(e: FormEvent) {
    e.preventDefault();
    setStarting(true);
    setMessage('');
    setError('');
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: form.startUrl,
        maxPages: form.maxPages,
        maxDepth: form.maxDepth,
        includePaths: form.includePaths
          ? form.includePaths.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        excludePaths: form.excludePaths
          ? form.excludePaths.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        timeoutMs: form.timeoutMs,
        jsRendering: form.jsRendering,
        deviceType: form.deviceType,
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
        <Link href={`/domains/${domainId}`}>← Back to domain</Link> ·{' '}
        <Link href={`/domains/${domainId}/consent`}>Consent configuration</Link> ·{' '}
        <Link href={`/domains/${domainId}/cookies`}>Cookie repository</Link>
      </p>
      <h1>Website scans</h1>
      <p style={{ color: 'var(--muted)' }}>
        Crawl <strong>{domain?.hostname ?? '…'}</strong> with a headless browser to detect cookies,
        storage, and trackers.
      </p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <form className="card" onSubmit={startScan} style={{ marginTop: '1.5rem' }}>
        <h3>Start manual scan</h3>
        <div className="field">
          <label htmlFor="startUrl">Start URL</label>
          <input
            id="startUrl"
            type="url"
            required
            value={form.startUrl}
            onChange={(e) => setForm({ ...form, startUrl: e.target.value })}
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="maxPages">Max pages (limit {domain?.scanLimit ?? 10})</label>
            <input
              id="maxPages"
              type="number"
              min={1}
              max={domain?.scanLimit ?? 10}
              value={form.maxPages}
              onChange={(e) => setForm({ ...form, maxPages: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="maxDepth">Max depth</label>
            <input
              id="maxDepth"
              type="number"
              min={0}
              max={10}
              value={form.maxDepth}
              onChange={(e) => setForm({ ...form, maxDepth: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="includePaths">Include paths (comma-separated)</label>
          <input
            id="includePaths"
            value={form.includePaths}
            placeholder="/blog, /docs"
            onChange={(e) => setForm({ ...form, includePaths: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="excludePaths">Exclude paths (comma-separated)</label>
          <input
            id="excludePaths"
            value={form.excludePaths}
            placeholder="/admin, /private"
            onChange={(e) => setForm({ ...form, excludePaths: e.target.value })}
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="timeoutMs">Page timeout (ms)</label>
            <input
              id="timeoutMs"
              type="number"
              min={5000}
              max={120000}
              value={form.timeoutMs}
              onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="deviceType">Device</label>
            <select
              id="deviceType"
              value={form.deviceType}
              onChange={(e) => setForm({ ...form, deviceType: e.target.value as 'desktop' | 'mobile' })}
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={form.jsRendering}
              onChange={(e) => setForm({ ...form, jsRendering: e.target.checked })}
            />
            JavaScript rendering (wait for network idle)
          </label>
        </div>
        <button className="btn" type="submit" disabled={starting}>
          {starting ? 'Starting…' : 'Start scan'}
        </button>
      </form>

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
                    <Link href={`/domains/${domainId}/scans/${scan.id}`}>View results</Link>
                    {scan.status === 'FAILED' && (
                      <>
                        {' · '}
                        <button
                          className="btn-link"
                          type="button"
                          disabled={retryingId === scan.id}
                          onClick={() => retryScan(scan.id)}
                        >
                          {retryingId === scan.id ? 'Retrying…' : 'Retry'}
                        </button>
                      </>
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
