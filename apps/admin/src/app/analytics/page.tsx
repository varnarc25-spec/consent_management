'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
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
  byCollectionMethod: Array<{ key: string; count: number }>;
  byRegion: Array<{ key: string; count: number }>;
  byRegulation: Array<{ key: string; count: number }>;
}

interface ScanAnalytics {
  totalScans: number;
  pagesScannedTotal: number;
  failedScans: number;
  byStatus: Array<{ status: string; count: number }>;
  byFindingType: Array<{ type: string; count: number }>;
}

function BarChart({
  items,
  labelKey,
  valueKey,
}: {
  items: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey])), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
      {items.map((item) => {
        const value = Number(item[valueKey]);
        const pct = (value / max) * 100;
        return (
          <div key={String(item[labelKey])} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ minWidth: '120px', fontSize: '0.8125rem' }}>{String(item[labelKey])}</span>
            <div
              style={{
                flex: 1,
                height: '20px',
                background: 'var(--border, #e5e7eb)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'var(--primary, #2563eb)',
                  borderRadius: '4px',
                  minWidth: value > 0 ? '2px' : '0',
                }}
              />
            </div>
            <span style={{ fontSize: '0.8125rem', minWidth: '2.5rem', textAlign: 'right' }}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainId, setDomainId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [consent, setConsent] = useState<ConsentAnalytics | null>(null);
  const [scans, setScans] = useState<ScanAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (domainId) params.set('domainId', domainId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();

    Promise.all([
      apiFetch<ConsentAnalytics>(`/insights/analytics/consent${qs ? `?${qs}` : ''}`),
      apiFetch<ScanAnalytics>(
        `/insights/analytics/scans${domainId ? `?domainId=${encodeURIComponent(domainId)}` : ''}`,
      ),
    ]).then(([consentRes, scanRes]) => {
      if (consentRes.data) setConsent(consentRes.data);
      if (scanRes.data) setScans(scanRes.data);
      setLoading(false);
    });
  }, [domainId, from, to]);

  useEffect(() => {
    apiFetch<Domain[]>('/domains').then((r) => {
      if (r.data) setDomains(r.data);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rateItems = consent
    ? [
        { label: 'Accept all', value: consent.rates.acceptAll },
        { label: 'Reject all', value: consent.rates.rejectAll },
        { label: 'Customized', value: consent.rates.customized },
        { label: 'Withdrawal', value: consent.rates.withdrawal },
        { label: 'GPC', value: consent.rates.gpc },
      ].map((r) => ({ label: r.label, pct: `${(r.value * 100).toFixed(1)}%`, value: r.value }))
    : [];

  return (
    <ProtectedLayout>
      <h1>Analytics</h1>
      <p style={{ color: 'var(--muted)' }}>Aggregated consent and scan metrics (privacy-safe).</p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Filters</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="field">
            <label htmlFor="domainId">Domain</label>
            <select
              id="domainId"
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
            >
              <option value="">All domains</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.hostname}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="from">From</label>
            <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn" type="button" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Apply'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>Consent analytics</h2>
        {consent ? (
          <>
            <p>Total interactions: <strong>{consent.totalInteractions}</strong></p>
            <h4>Consent rates</h4>
            <BarChart items={rateItems.map((r) => ({ label: r.label, count: r.value }))} labelKey="label" valueKey="count" />
            <ul style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {rateItems.map((r) => (
                <li key={r.label}>{r.label}: {r.pct}</li>
              ))}
            </ul>
            <h4 style={{ marginTop: '1rem' }}>By region</h4>
            <BarChart items={consent.byRegion.map((r) => ({ key: r.key, count: r.count }))} labelKey="key" valueKey="count" />
            <h4 style={{ marginTop: '1rem' }}>By regulation</h4>
            <BarChart items={consent.byRegulation.map((r) => ({ key: r.key, count: r.count }))} labelKey="key" valueKey="count" />
            <h4 style={{ marginTop: '1rem' }}>By collection method</h4>
            <BarChart
              items={consent.byCollectionMethod.map((r) => ({ key: r.key, count: r.count }))}
              labelKey="key"
              valueKey="count"
            />
          </>
        ) : (
          <p>Loading…</p>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>Scan analytics</h2>
        {scans ? (
          <>
            <p>
              Total scans: <strong>{scans.totalScans}</strong> · Pages scanned:{' '}
              <strong>{scans.pagesScannedTotal}</strong> · Failed: <strong>{scans.failedScans}</strong>
            </p>
            <h4>By status</h4>
            <BarChart items={scans.byStatus.map((r) => ({ status: r.status, count: r.count }))} labelKey="status" valueKey="count" />
            <h4 style={{ marginTop: '1rem' }}>Findings by type</h4>
            <BarChart items={scans.byFindingType.map((r) => ({ type: r.type, count: r.count }))} labelKey="type" valueKey="count" />
          </>
        ) : (
          <p>Loading…</p>
        )}
      </div>
    </ProtectedLayout>
  );
}
