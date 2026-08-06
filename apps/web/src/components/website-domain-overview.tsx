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
    <div className="website-sidebar-panels">
      {hasRunningScan && (
        <p className="website-sidebar-note success" role="status">
          Scan in progress
          {runningScan?.maxPages
            ? ` (${runningScan.pagesScanned ?? 0}/${runningScan.maxPages} pages)`
            : ''}
        </p>
      )}
      {message && <p className="website-sidebar-note success">{message}</p>}

      <section className="website-sidebar-section">
        <h2 className="website-sidebar-section-title">Overview</h2>
        <div className="domain-panel website-sidebar-panel domain-overview-merged">
          <div className="domain-overview-merged-grid website-sidebar-stack">
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
                  {nextScanAt && frequency !== 'MANUAL'
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

            <div className="domain-overview-cookies website-sidebar-divider">
              <h3>Cookies &amp; trackers</h3>
              <p className="domain-cookie-total domain-cookie-total-sidebar">
                {cookieSummary?.total ?? 0}
              </p>
              {summaryError && (
                <p className="error" style={{ fontSize: '0.8125rem' }}>{summaryError}</p>
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
                <p className="website-sidebar-muted">
                  {hasRunningScan
                    ? 'Waiting for scan results…'
                    : 'No inventory yet. Run a homepage scan.'}
                </p>
              )}
              <Link className="domain-panel-link" href={`/websites/${domainId}/scans`}>
                View scans →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="website-sidebar-section">
        <h2 className="website-sidebar-section-title">Scan settings</h2>
        <div className="domain-panel website-sidebar-panel domain-scan-merged">
          <p className="website-sidebar-muted">
            Save website settings after changing frequency. Homepage scans use one page with full
            consent probing.
          </p>
          <div className="field" style={{ marginBottom: '1rem' }}>
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
          <div className="domain-scan-now-inline">
            <p className="domain-scan-now-label">Scan homepage now</p>
            <p className="website-sidebar-muted">Usually under a minute.</p>
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
  );
}
