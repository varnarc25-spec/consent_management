'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, ensureApiSession, getApiUrl } from '@/lib/api';

interface ScanSummary {
  id: string;
  status: string;
  pagesScanned: number;
  completedAt: string | null;
  createdAt: string;
}

interface CookieCategorySummary {
  total: number;
  categories: Array<{ slug: string; name: string; count: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  strictly_necessary: 'Necessary',
  preferences: 'Preferences',
  functional: 'Functional',
  analytics: 'Statistics',
  performance: 'Performance',
  marketing: 'Marketing',
  social_media: 'Social Media',
  unclassified: 'Unclassified',
};

const CATEGORY_ORDER = [
  'strictly_necessary',
  'preferences',
  'functional',
  'analytics',
  'performance',
  'marketing',
  'social_media',
  'unclassified',
];

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
  onFrequencyChange?: (frequency: string) => void;
}

export function WebsiteDomainOverview({
  domainId,
  hostname,
  scanLimit,
  scanFrequency,
  nextScanAt,
  onFrequencyChange,
}: WebsiteDomainOverviewProps) {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const scansRef = useRef<ScanSummary[]>([]);
  const [cookieSummary, setCookieSummary] = useState<CookieCategorySummary | null>(null);
  const [frequency, setFrequency] = useState(scanFrequency);
  const [startingScan, setStartingScan] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFrequency(scanFrequency);
  }, [scanFrequency]);

  function loadScans() {
    apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`).then((r) => {
      if (r.data) {
        setScans(r.data);
        scansRef.current = r.data;
      }
    });
  }

  function loadCookieSummary() {
    apiFetch<CookieCategorySummary>(`/domains/${domainId}/cookies/summary`).then((r) => {
      if (r.data) setCookieSummary(r.data);
    });
  }

  useEffect(() => {
    loadScans();
    loadCookieSummary();
    const timer = window.setInterval(() => {
      if (scansRef.current.some((s) => s.status === 'RUNNING')) {
        loadScans();
        loadCookieSummary();
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [domainId]);

  const lastCompletedScan = useMemo(() => scans.find((s) => s.status === 'COMPLETED'), [scans]);

  const sortedCategories = useMemo(() => {
    if (!cookieSummary) return [];
    const bySlug = new Map(cookieSummary.categories.map((c) => [c.slug, c]));
    const ordered = CATEGORY_ORDER
      .filter((slug) => bySlug.has(slug))
      .map((slug) => ({
        slug,
        label: CATEGORY_LABELS[slug] ?? bySlug.get(slug)!.name,
        count: bySlug.get(slug)!.count,
      }));
    for (const c of cookieSummary.categories) {
      if (!CATEGORY_ORDER.includes(c.slug)) {
        ordered.push({
          slug: c.slug,
          label: CATEGORY_LABELS[c.slug] ?? c.name,
          count: c.count,
        });
      }
    }
    return ordered;
  }, [cookieSummary]);

  async function startScan() {
    setStartingScan(true);
    setMessage('');
    const sessionOk = await ensureApiSession();
    if (!sessionOk) {
      setStartingScan(false);
      return;
    }
    const result = await apiFetch<ScanSummary>(`/domains/${domainId}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: `https://${hostname}/`,
        maxPages: Math.min(10, scanLimit),
        maxDepth: 2,
        timeoutMs: 30000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStartingScan(false);
    if (result.ok) {
      setMessage('Scan started');
      loadScans();
    }
  }

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
    <>
      {message && <p className="success">{message}</p>}

      <section className="domain-section">
        <h2 className="domain-section-title">Overview</h2>
        <div className="domain-overview-grid">
          <div className="domain-panel">
            <h3>Status</h3>
            <div className="domain-stat-row">
              <span className="domain-stat-label">Last scan</span>
              <span className="domain-stat-value">
                {lastCompletedScan?.completedAt
                  ? formatScanDate(lastCompletedScan.completedAt)
                  : scans.some((s) => s.status === 'RUNNING')
                    ? 'Running…'
                    : '—'}
              </span>
            </div>
            <div className="domain-stat-row">
              <span className="domain-stat-label">Next scan</span>
              <span className="domain-stat-value">
                {nextScanAt && frequency !== 'MANUAL'
                  ? formatScanDate(nextScanAt)
                  : 'Not scheduled'}
              </span>
            </div>
            {lastCompletedScan && (
              <div className="domain-stat-row">
                <span className="domain-stat-label">Scanned subpages</span>
                <span className="domain-stat-value">
                  {lastCompletedScan.pagesScanned} subpages{' '}
                  <button
                    className="btn-link"
                    type="button"
                    onClick={() => downloadPagesCsv(lastCompletedScan.id)}
                  >
                    Download CSV
                  </button>
                </span>
              </div>
            )}
          </div>

          <div className="domain-panel">
            <h3>Cookies and Trackers</h3>
            <p className="domain-cookie-total">{cookieSummary?.total ?? 0}</p>
            <ul className="domain-category-list">
              {sortedCategories.map((c) => (
                <li key={c.slug}>
                  <span>{c.label}</span>
                  <span>{c.count}</span>
                </li>
              ))}
            </ul>
            <Link className="domain-panel-link" href={`/websites/${domainId}/scans`}>
              View scans and cookie findings →
            </Link>
          </div>
        </div>
      </section>

      <section className="domain-section">
        <h2 className="domain-section-title">Scan settings</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Choose how often {hostname} should be scanned automatically. Save website settings below
          after changing frequency.
        </p>
        <div className="domain-scan-grid">
          <div className="domain-panel">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="webScanFrequency">Scan frequency</label>
              <select
                id="webScanFrequency"
                value={frequency}
                onChange={(e) => {
                  setFrequency(e.target.value);
                  onFrequencyChange?.(e.target.value);
                }}
              >
                <option value="MANUAL">Manual</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>
          <div className="domain-panel domain-scan-now-card">
            <p>Scan your domain now</p>
            <button className="btn" type="button" disabled={startingScan} onClick={startScan}>
              {startingScan ? 'Starting…' : 'Start domain scan'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
