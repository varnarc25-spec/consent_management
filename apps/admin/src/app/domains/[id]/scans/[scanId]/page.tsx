'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { apiFetch } from '@/lib/api';

interface ScanDetail {
  id: string;
  status: string;
  startUrl: string;
  maxPages: number;
  maxDepth: number;
  pagesScanned: number;
  cookiesFound: number;
  trackersFound: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  deviceType: string;
  jsRendering: boolean;
  pages: Array<{
    id: string;
    url: string;
    status: string;
    depth: number;
    errorMessage: string | null;
    scannedAt: string;
  }>;
  findings: Array<{
    id: string;
    findingType: string;
    consentState: string;
    name: string;
    valueSample: string | null;
    cookieDomain: string | null;
    isThirdParty: boolean | null;
    pageUrl: string | null;
    technology: string | null;
    sourceUrl: string | null;
  }>;
}

type FindingFilter = 'all' | 'COOKIE' | 'SCRIPT' | 'IFRAME' | 'PIXEL' | 'STORAGE';

interface ScanSummary {
  id: string;
  createdAt: string;
  status: string;
}

interface ScanCompareResult {
  newCookies: Array<{ name: string; domain: string | null; category: string | null }>;
  removedCookies: Array<{ name: string; domain: string | null }>;
  changedCookies: Array<{
    key: string;
    before: { name: string; category: string | null };
    after: { name: string; category: string | null };
    changes: string[];
  }>;
}

export default function ScanDetailPage() {
  const params = useParams();
  const domainId = params.id as string;
  const scanId = params.scanId as string;
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const scanRef = useRef<ScanDetail | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanSummary[]>([]);
  const [baselineScanId, setBaselineScanId] = useState('');
  const [compareResult, setCompareResult] = useState<ScanCompareResult | null>(null);
  const [filter, setFilter] = useState<FindingFilter>('all');
  const [consentFilter, setConsentFilter] = useState('all');

  useEffect(() => {
    function loadScan(silent = false) {
      return apiFetch<ScanDetail>(`/domains/${domainId}/scans/${scanId}`, { silent }).then((r) => {
        if (r.data) {
          setScan(r.data);
          scanRef.current = r.data;
        }
        return r.data;
      });
    }

    loadScan();
    apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`, { silent: true }).then((r) => {
      if (r.data) {
        setScanHistory(r.data.filter((item) => item.id !== scanId && item.status === 'COMPLETED'));
      }
    });

    const timer = window.setInterval(() => {
      if (scanRef.current?.status === 'RUNNING') {
        loadScan(true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [domainId, scanId]);

  useEffect(() => {
    if (!baselineScanId) {
      setCompareResult(null);
      return;
    }
    apiFetch<ScanCompareResult>(
      `/domains/${domainId}/scans/compare?baseline=${baselineScanId}&target=${scanId}`,
    ).then((r) => {
      if (r.data) setCompareResult(r.data);
    });
  }, [baselineScanId, domainId, scanId]);

  const filteredFindings = useMemo(() => {
    if (!scan) return [];
    return scan.findings.filter((finding) => {
      if (filter !== 'all') {
        if (filter === 'STORAGE') {
          if (!['LOCAL_STORAGE', 'SESSION_STORAGE', 'INDEXED_DB'].includes(finding.findingType)) {
            return false;
          }
        } else if (finding.findingType !== filter) {
          return false;
        }
      }
      if (consentFilter !== 'all' && finding.consentState !== consentFilter) return false;
      return true;
    });
  }, [scan, filter, consentFilter]);

  if (!scan) {
    return (
      <ProtectedLayout>
        <LoadingScreen message="Loading scan…" inline />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <p>
        <Link href={`/domains/${domainId}/scans`}>← Back to scans</Link>
      </p>
      <h1>Scan results</h1>
      <p style={{ color: 'var(--muted)' }}>
        Status: <code>{scan.status}</code> · Pages: {scan.pagesScanned}/{scan.maxPages} · Cookies:{' '}
        {scan.cookiesFound} · Trackers: {scan.trackersFound}
      </p>
      {scan.errorMessage && <p className="error">{scan.errorMessage}</p>}

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Configuration</h3>
        <ul style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          <li>Start URL: <code>{scan.startUrl}</code></li>
          <li>Depth: {scan.maxDepth}</li>
          <li>Device: {scan.deviceType}</li>
          <li>JS rendering: {scan.jsRendering ? 'yes' : 'no'}</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Pages scanned ({scan.pages.length})</h3>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Depth</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {scan.pages.map((page) => (
              <tr key={page.id}>
                <td><code style={{ fontSize: '0.8rem' }}>{page.url}</code></td>
                <td>{page.depth}</td>
                <td>
                  {page.status}
                  {page.errorMessage ? ` — ${page.errorMessage}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Findings ({filteredFindings.length})</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {(['all', 'COOKIE', 'SCRIPT', 'IFRAME', 'PIXEL', 'STORAGE'] as FindingFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'btn' : 'btn btn-secondary'}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
          <select value={consentFilter} onChange={(e) => setConsentFilter(e.target.value)}>
            <option value="all">All consent states</option>
            <option value="BEFORE_CONSENT">Before consent</option>
            <option value="AFTER_ACCEPT">After accept</option>
            <option value="AFTER_REJECT">After reject</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Technology</th>
              <th>Consent state</th>
              <th>Third party</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredFindings.map((finding) => (
              <tr key={finding.id}>
                <td><code>{finding.findingType}</code></td>
                <td>{finding.name}</td>
                <td>{finding.technology ?? '—'}</td>
                <td><code>{finding.consentState}</code></td>
                <td>{finding.isThirdParty ? 'yes' : finding.isThirdParty === false ? 'no' : '—'}</td>
                <td>
                  <code style={{ fontSize: '0.75rem' }}>
                    {finding.sourceUrl ?? finding.pageUrl ?? finding.cookieDomain ?? '—'}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Compare with previous scan</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Highlight new, removed, and changed cookies between a baseline scan and this scan.
        </p>
        <div className="field">
          <label htmlFor="baselineScan">Baseline scan</label>
          <select
            id="baselineScan"
            value={baselineScanId}
            onChange={(e) => setBaselineScanId(e.target.value)}
          >
            <option value="">Select a completed scan…</option>
            {scanHistory.map((item) => (
              <option key={item.id} value={item.id}>
                {new Date(item.createdAt).toLocaleString()} ({item.status})
              </option>
            ))}
          </select>
        </div>
        {compareResult && (
          <div style={{ marginTop: '1rem' }}>
            <p>
              <strong>New:</strong> {compareResult.newCookies.length} ·{' '}
              <strong>Removed:</strong> {compareResult.removedCookies.length} ·{' '}
              <strong>Changed:</strong> {compareResult.changedCookies.length}
            </p>
            {compareResult.newCookies.length > 0 && (
              <>
                <h4>New cookies</h4>
                <ul>
                  {compareResult.newCookies.map((cookie) => (
                    <li key={`new-${cookie.name}-${cookie.domain}`}>
                      <code>{cookie.name}</code> ({cookie.domain ?? 'host-only'})
                    </li>
                  ))}
                </ul>
              </>
            )}
            {compareResult.removedCookies.length > 0 && (
              <>
                <h4>Removed cookies</h4>
                <ul>
                  {compareResult.removedCookies.map((cookie) => (
                    <li key={`removed-${cookie.name}-${cookie.domain}`}>
                      <code>{cookie.name}</code> ({cookie.domain ?? 'host-only'})
                    </li>
                  ))}
                </ul>
              </>
            )}
            {compareResult.changedCookies.length > 0 && (
              <>
                <h4>Changed cookies</h4>
                <ul>
                  {compareResult.changedCookies.map((item) => (
                    <li key={item.key}>
                      <code>{item.after.name}</code> — {item.changes.join(', ')}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
