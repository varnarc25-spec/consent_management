'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunningScanPoll } from '@/hooks/use-running-scan-poll';
import { apiFetch, ensureApiSession, getApiUrl } from '@/lib/api';

interface ScanSummary {
  id: string;
  status: string;
  pagesScanned: number;
  maxPages?: number;
  cookiesFound?: number;
  trackersFound?: number;
  errorMessage?: string | null;
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
  const [cookieSummary, setCookieSummary] = useState<CookieCategorySummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [frequency, setFrequency] = useState(scanFrequency);
  const [startingScan, setStartingScan] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFrequency(scanFrequency);
  }, [scanFrequency]);

  function loadScans(silent = true) {
    return apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`, { silent }).then((r) => {
      if (r.data) setScans(r.data);
      return r.data;
    });
  }

  function loadCookieSummary(silent = true) {
    return apiFetch<CookieCategorySummary>(`/domains/${domainId}/cookies/summary`, { silent }).then(
      (r) => {
        if (r.data) {
          setCookieSummary(r.data);
          setSummaryError('');
        } else if (r.error) {
          setSummaryError(r.error.message);
        }
      },
    );
  }

  useEffect(() => {
    loadScans(true);
    loadCookieSummary(true);
  }, [domainId]);

  const hasRunningScan = scans.some((s) => s.status === 'RUNNING');

  const pollScanProgress = useCallback(async () => {
    await loadScans(true);
  }, [domainId]);

  const refreshAfterScan = useCallback(async () => {
    await Promise.all([loadScans(true), loadCookieSummary(true)]);
  }, [domainId]);

  useRunningScanPoll(hasRunningScan, pollScanProgress, refreshAfterScan);

  const runningScan = scans.find((s) => s.status === 'RUNNING');

  const lastCompletedScan = useMemo(
    () => scans.find((s) => s.status === 'COMPLETED'),
    [scans],
  );

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

  const categoriesWithCounts = sortedCategories.filter((c) => c.count > 0);

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
        maxPages: 1,
        maxDepth: 0,
        timeoutMs: 45000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStartingScan(false);
    if (result.ok) {
      setMessage('Scan started');
      await loadScans(true);
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
      {hasRunningScan && (
        <p className="success" role="status">
          Scan in progress
          {runningScan?.maxPages
            ? ` (${runningScan.pagesScanned ?? 0}/${runningScan.maxPages} pages, ${runningScan.cookiesFound ?? 0} cookies, ${runningScan.trackersFound ?? 0} trackers)`
            : ''}
          — updates every few seconds (scan progress only).
        </p>
      )}

      {message && <p className="success">{message}</p>}

      <div className="domain-bottom-row">
        <section className="domain-section domain-section-in-row">
          <h2 className="domain-section-title">Overview</h2>
          <div className="domain-overview-grid">
          <div className="domain-panel">
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
                {nextScanAt && frequency !== 'MANUAL'
                  ? formatScanDate(nextScanAt)
                  : 'Not scheduled'}
              </span>
            </div>
            {lastCompletedScan?.errorMessage && (
              <p className="error" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {lastCompletedScan.errorMessage}
              </p>
            )}
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
            {summaryError && (
              <p className="error" style={{ fontSize: '0.875rem' }}>{summaryError}</p>
            )}
            {categoriesWithCounts.length > 0 ? (
              <ul className="domain-category-list">
                {categoriesWithCounts.map((c) => (
                  <li key={c.slug}>
                    <span>{c.label}</span>
                    <span>{c.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                {hasRunningScan
                  ? 'Waiting for scan results…'
                  : 'No cookies or trackers in inventory yet. Run a domain scan below.'}
              </p>
            )}
            <Link className="domain-panel-link" href={`/websites/${domainId}/scans`}>
              View scans and cookie findings →
            </Link>
          </div>
          </div>
        </section>

        <section className="domain-section domain-section-in-row">
          <h2 className="domain-section-title">Scan settings</h2>
          <p className="domain-section-hint">
            Choose how often {hostname} should be scanned automatically. Save website settings below
            after changing frequency. Manual scans use homepage-only mode for a quick inventory check.
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
            <p>Scan homepage now</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.25rem 0 0.75rem' }}>
              One page, full consent probe — usually under a minute.
            </p>
            <button
              className="btn"
              type="button"
              disabled={startingScan || hasRunningScan}
              onClick={startScan}
            >
              {startingScan ? 'Starting…' : hasRunningScan ? 'Scan running…' : 'Scan homepage'}
            </button>
          </div>
          </div>
        </section>
      </div>
    </>
  );
}
