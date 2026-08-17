'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  sortCookieCategories,
  type CookieCategorySummary,
} from '@/lib/cookie-categories';
import { useWebsiteScan } from '@/components/website-scan-context';

interface WebsiteDashboardProps {
  domainId: string;
  hostname: string;
  sdkLastSeenAt: string | null;
  scanFrequency: string;
  nextScanAt: string | null;
  enabled: boolean;
}

interface ConsentAnalytics {
  totalInteractions: number;
  rates: {
    acceptAll: number;
    rejectAll: number;
    customized: number;
    withdrawal: number;
    gpc: number;
  };
  byConsentStatus: Array<{ key: string; count: number }>;
  byRegulation: Array<{ key: string; count: number }>;
}

interface ConsentRecordItem {
  id: string;
  region: string | null;
  consentStatus: string;
  createdAt: string;
}

interface Organization {
  defaultRegulation: string | null;
}

function formatScanDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

function formatShortDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function statusLabel(status: string) {
  switch (status) {
    case 'GRANTED':
      return 'Accepted';
    case 'REJECTED':
      return 'Rejected';
    case 'PARTIAL':
      return 'Partially accepted';
    case 'WITHDRAWN':
      return 'Withdrawn';
    default:
      return status;
  }
}

function statusTone(status: string) {
  switch (status) {
    case 'GRANTED':
      return 'accepted';
    case 'REJECTED':
    case 'WITHDRAWN':
      return 'rejected';
    case 'PARTIAL':
      return 'partial';
    default:
      return 'neutral';
  }
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildDayBuckets(records: ConsentRecordItem[], days = 7) {
  const buckets: Array<{ key: string; label: string; count: number }> = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    buckets.push({ key, label: formatShortDay(day.toISOString()), count: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const record of records) {
    const key = record.createdAt.slice(0, 10);
    const idx = index.get(key);
    if (idx !== undefined) buckets[idx].count += 1;
  }
  return buckets;
}

function DonutChart({
  accepted,
  rejected,
  partial,
  total,
}: {
  accepted: number;
  rejected: number;
  partial: number;
  total: number;
}) {
  const size = 148;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total || 1;
  const segments = [
    { value: accepted, color: '#22c55e' },
    { value: rejected, color: '#f43f5e' },
    { value: partial, color: '#3b82f6' },
  ];
  let offset = 0;

  return (
    <div className="wd-donut" aria-hidden={total === 0}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {total > 0 &&
          segments.map((seg) => {
            if (seg.value <= 0) return null;
            const length = (seg.value / safeTotal) * circumference;
            const el = (
              <circle
                key={seg.color}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += length;
            return el;
          })}
      </svg>
      <div className="wd-donut-center">
        <strong>{total}</strong>
        <span>Total consents</span>
      </div>
    </div>
  );
}

function AreaChart({ points }: { points: Array<{ label: string; count: number }> }) {
  const max = Math.max(...points.map((p) => p.count), 1);
  const width = 360;
  const height = 140;
  const padX = 8;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const coords = points.map((p, i) => {
    const x = padX + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = padY + innerH - (p.count / max) * innerH;
    return { x, y, ...p };
  });
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const area = `${line} L ${coords[coords.length - 1]?.x ?? padX} ${padY + innerH} L ${coords[0]?.x ?? padX} ${padY + innerH} Z`;

  return (
    <div className="wd-area-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Consent activity chart">
        <path d={area} fill="rgba(59, 130, 246, 0.18)" />
        <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r="3" fill="#2563eb" />
        ))}
      </svg>
      <div className="wd-area-labels">
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

export function WebsiteDashboard({
  domainId,
  hostname,
  sdkLastSeenAt,
  scanFrequency,
  nextScanAt,
  enabled,
}: WebsiteDashboardProps) {
  const websiteScan = useWebsiteScan();
  const scans = websiteScan?.scans ?? [];
  const hasRunningScan = Boolean(websiteScan?.hasRunningScan);

  const [cookieSummary, setCookieSummary] = useState<CookieCategorySummary | null>(null);
  const [analytics, setAnalytics] = useState<ConsentAnalytics | null>(null);
  const [records, setRecords] = useState<ConsentRecordItem[]>([]);
  const [regulation, setRegulation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const lastCompletedScan = useMemo(
    () => scans.find((s) => s.status === 'COMPLETED'),
    [scans],
  );

  const bannerActive = Boolean(sdkLastSeenAt) && enabled;
  const categoriesWithCookies = useMemo(
    () => (cookieSummary ? sortCookieCategories(cookieSummary.categories).filter((c) => c.count > 0) : []),
    [cookieSummary],
  );

  const trendCounts = useMemo(() => {
    const byStatus = Object.fromEntries(
      (analytics?.byConsentStatus ?? []).map((r) => [r.key, r.count]),
    );
    const accepted = byStatus.GRANTED ?? 0;
    const rejected = byStatus.REJECTED ?? 0;
    const partial = byStatus.PARTIAL ?? 0;
    const withdrawn = byStatus.WITHDRAWN ?? 0;
    const total = analytics?.totalInteractions ?? accepted + rejected + partial + withdrawn;
    return { accepted, rejected, partial: partial + withdrawn, total };
  }, [analytics]);

  const activityPoints = useMemo(() => buildDayBuckets(records, 7), [records]);

  const primaryRegulation =
    analytics?.byRegulation?.[0]?.key || regulation || 'Not configured';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const from = daysAgoIso(6);
      const to = new Date().toISOString();
      const [cookiesRes, analyticsRes, recordsRes, orgRes] = await Promise.all([
        apiFetch<CookieCategorySummary>(`/domains/${domainId}/cookies/summary`, { silent: true }),
        apiFetch<ConsentAnalytics>(
          `/insights/analytics/consent?domainId=${encodeURIComponent(domainId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { silent: true },
        ),
        apiFetch<{ items: ConsentRecordItem[] }>(
          `/consent-records?domainId=${encodeURIComponent(domainId)}&from=${encodeURIComponent(from)}&limit=100`,
          { silent: true },
        ),
        apiFetch<Organization>('/organizations/me', { silent: true }),
      ]);
      if (cancelled) return;
      if (cookiesRes.data) setCookieSummary(cookiesRes.data);
      if (analyticsRes.data) setAnalytics(analyticsRes.data);
      if (recordsRes.data?.items) setRecords(recordsRes.data.items);
      if (orgRes.data?.defaultRegulation) setRegulation(orgRes.data.defaultRegulation);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [domainId]);

  const recentLogs = records.slice(0, 8);

  return (
    <section className="website-dashboard" aria-label="Website dashboard">
      <div className="website-dashboard-grid">
        <article className="wd-card">
          <div className="wd-card-body">
            <p className="wd-url">https://{hostname}</p>
            <div className="wd-banner-row">
              <span className="wd-label">Cookie banner status</span>
              <span className={`wd-status-pill ${bannerActive ? 'is-active' : 'is-inactive'}`}>
                {bannerActive ? 'Active' : sdkLastSeenAt ? 'Paused' : 'Inactive'}
              </span>
            </div>
            {bannerActive ? (
              <p className="wd-success-note">Banner script has reported from this website.</p>
            ) : (
              <p className="wd-muted">
                Install the CMP script to activate the live banner. Scans still work without it.
              </p>
            )}
            <div className="wd-meta-grid">
              <div>
                <span className="wd-label">Regulation</span>
                <p className="wd-meta-value">{primaryRegulation}</p>
              </div>
              <div>
                <span className="wd-label">Targeted location</span>
                <p className="wd-meta-value">
                  Worldwide <span className="wd-chip">Geo-target</span>
                </p>
              </div>
            </div>
            <Link className="wd-link" href={`/websites/${domainId}/test-banner`}>
              Live preview banner
            </Link>
          </div>
          <Link className="wd-card-footer" href={`/websites/${domainId}/consent`}>
            Customise banner
          </Link>
        </article>

        <article className="wd-card">
          <div className="wd-card-body">
            <div className="wd-stat-pair">
              <div>
                <strong>{cookieSummary?.total ?? 0}</strong>
                <span>Total cookies</span>
              </div>
              <div>
                <strong>{categoriesWithCookies.length}</strong>
                <span>Categories</span>
              </div>
            </div>
            <div className="wd-meta-list">
              <div className="wd-meta-row">
                <span>Last successful scan</span>
                <span>
                  {lastCompletedScan?.completedAt
                    ? formatScanDate(lastCompletedScan.completedAt)
                    : hasRunningScan
                      ? 'Running…'
                      : '—'}
                </span>
              </div>
              <div className="wd-meta-row">
                <span>Pages scanned</span>
                <span>{lastCompletedScan?.pagesScanned ?? 0}</span>
              </div>
              <div className="wd-meta-row">
                <span>Next scan</span>
                <span>
                  {nextScanAt && scanFrequency !== 'MANUAL'
                    ? formatScanDate(nextScanAt)
                    : 'Not scheduled'}
                </span>
              </div>
            </div>
          </div>
          <Link className="wd-card-footer" href={`/websites/${domainId}/cookies`}>
            Manage cookies
          </Link>
        </article>

        <article className="wd-card">
          <div className="wd-card-body">
            <div className="wd-card-heading">
              <h3>Consent trends</h3>
              <span className="wd-muted">Last 7 days</span>
            </div>
            <div className="wd-trends">
              <DonutChart
                accepted={trendCounts.accepted}
                rejected={trendCounts.rejected}
                partial={trendCounts.partial}
                total={trendCounts.total}
              />
              <ul className="wd-legend">
                <li>
                  <span className="wd-dot accepted" /> Accepted
                  <strong>{trendCounts.accepted}</strong>
                </li>
                <li>
                  <span className="wd-dot rejected" /> Rejected
                  <strong>{trendCounts.rejected}</strong>
                </li>
                <li>
                  <span className="wd-dot partial" /> Partially accepted
                  <strong>{trendCounts.partial}</strong>
                </li>
              </ul>
            </div>
            {loading && <p className="wd-muted">Loading consent data…</p>}
            {!loading && trendCounts.total === 0 && (
              <p className="wd-muted">No consent events yet. Install the SDK to start collecting.</p>
            )}
          </div>
          <Link className="wd-card-footer" href={`/websites/${domainId}/consent`}>
            View all data
          </Link>
        </article>

        <article className="wd-card">
          <div className="wd-card-body">
            <div className="wd-card-heading">
              <h3>Consent activity</h3>
              <span className="wd-muted">Last 7 days</span>
            </div>
            <AreaChart points={activityPoints} />
            <p className="wd-muted wd-chart-note">
              Daily consent events. Full pageview analytics appear after the CMP SDK is installed on
              the site.
            </p>
          </div>
          <Link className="wd-card-footer" href={`/websites/${domainId}/scans`}>
            View scans
          </Link>
        </article>

        <article className="wd-card wd-card-wide">
          <div className="wd-card-body">
            <div className="wd-card-heading">
              <h3>Recent consent logs</h3>
            </div>
            {recentLogs.length === 0 ? (
              <p className="wd-muted">
                No consent logs yet. Visitors will appear here once the banner is live.
              </p>
            ) : (
              <div className="wd-table-wrap">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th>Consent ID</th>
                      <th>Country</th>
                      <th>Consent status</th>
                      <th>Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((row) => (
                      <tr key={row.id}>
                        <td className="wd-mono">{row.id.slice(0, 8)}…</td>
                        <td>{row.region || '—'}</td>
                        <td>
                          <span className={`wd-consent-pill ${statusTone(row.consentStatus)}`}>
                            {statusLabel(row.consentStatus)}
                          </span>
                        </td>
                        <td>{formatScanDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
