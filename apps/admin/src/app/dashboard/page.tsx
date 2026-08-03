'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

interface Overview {
  widgets: {
    activeDomains: number;
    verifiedDomains: number;
    installationHealth: { pass: number; warning: number; fail: number };
    consentInteractions30d: number;
    expiringConsents30d: number;
    unknownCookies: number;
    preConsentViolations7d: number;
    consentModeStatus: { pass: number; warning: number };
    unreadNotifications: number;
    lastScan: {
      id: string;
      domainId: string;
      status: string;
      createdAt: string;
      pagesScanned: number | null;
    } | null;
  };
  domainHealth: Array<{
    domainId: string;
    hostname: string;
    verificationStatus: string;
    installationStatus: string;
    sdkLastSeenAt: string | null;
    consentModeStatus: string;
    integrationSource: string | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/insights/notifications/sync', { method: 'POST' }).catch(() => undefined);
    apiFetch<Overview>('/insights/overview').then((r) => {
      if (r.data) setData(r.data);
      else setError(r.error?.message ?? 'Failed to load dashboard');
    });
  }, []);

  const w = data?.widgets;

  return (
    <ProtectedLayout>
      <h1>Compliance dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Organization-wide compliance health, consent activity, and installation status.
      </p>

      {error && <p className="error">{error}</p>}

      {w && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '1.5rem',
            }}
          >
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Domains</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{w.activeDomains}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                {w.verifiedDomains} verified
              </p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Installation</h3>
              <p style={{ fontSize: '0.875rem' }}>
                <span className="success">{w.installationHealth.pass} pass</span> ·{' '}
                <span style={{ color: 'var(--warning)' }}>{w.installationHealth.warning} warn</span> ·{' '}
                <span className="error">{w.installationHealth.fail} fail</span>
              </p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Consent (30d)</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{w.consentInteractions30d}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                {w.expiringConsents30d} expiring soon
              </p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Cookies</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{w.unknownCookies}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>pending review</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Pre-consent blocks</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{w.preConsentViolations7d}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>last 7 days</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Consent Mode</h3>
              <p style={{ fontSize: '0.875rem' }}>
                {w.consentModeStatus.pass} ok · {w.consentModeStatus.warning} needs attention
              </p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Notifications</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{w.unreadNotifications}</p>
              <Link href="/notifications">View center</Link>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Last scan</h3>
              {w.lastScan ? (
                <p style={{ fontSize: '0.875rem' }}>
                  {w.lastScan.status} · {w.lastScan.pagesScanned ?? 0} pages
                  <br />
                  <Link href={`/domains/${w.lastScan.domainId}/scans/${w.lastScan.id}`}>
                    View scan
                  </Link>
                </p>
              ) : (
                <p style={{ color: 'var(--muted)' }}>No scans yet</p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3>Domain health</h3>
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Verification</th>
                  <th>Installation</th>
                  <th>Integration</th>
                  <th>Consent Mode</th>
                  <th>SDK last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.domainHealth.map((row) => (
                  <tr key={row.domainId}>
                    <td>
                      <Link href={`/domains/${row.domainId}`}>{row.hostname}</Link>
                    </td>
                    <td>{row.verificationStatus}</td>
                    <td>{row.installationStatus}</td>
                    <td>{row.integrationSource ?? '—'}</td>
                    <td>{row.consentModeStatus}</td>
                    <td>
                      {row.sdkLastSeenAt
                        ? new Date(row.sdkLastSeenAt).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProtectedLayout>
  );
}
