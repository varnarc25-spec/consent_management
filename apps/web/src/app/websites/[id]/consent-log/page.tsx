'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { WebsiteScanStatus } from '@/components/website-scan-context';
import { apiFetch } from '@/lib/api';

interface ConsentRecordItem {
  id: string;
  region: string | null;
  consentStatus: string;
  createdAt: string;
  visitorId: string;
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

export default function ConsentLogPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [hostname, setHostname] = useState('');
  const [items, setItems] = useState<ConsentRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ hostname: string }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (r.data) setHostname(r.data.hostname);
    });
    apiFetch<{ items: ConsentRecordItem[] }>(
      `/consent-records?domainId=${encodeURIComponent(domainId)}&limit=50`,
      { silent: true },
    ).then((r) => {
      if (r.data?.items) setItems(r.data.items);
      setLoading(false);
    });
  }, [domainId]);

  return (
    <ProtectedLayout>
      <WebsiteLayout domainId={domainId} hostname={hostname || undefined}>
        <div className="website-page-header website-page-header-end">
          <WebsiteScanStatus />
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Consent Log</h2>
          <p className="website-section-muted">
            Proof records for visitor consent on {hostname || 'this website'}.
          </p>
          {loading ? (
            <p className="website-section-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="website-section-muted">
              No consent logs yet. Install the CMP script and collect banner interactions.
            </p>
          ) : (
            <div className="wd-table-wrap">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>Consent ID</th>
                    <th>Visitor</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className="wd-mono">{row.id.slice(0, 10)}…</td>
                      <td className="wd-mono">{row.visitorId.slice(0, 10)}…</td>
                      <td>{row.region || '—'}</td>
                      <td>{statusLabel(row.consentStatus)}</td>
                      <td>{new Date(row.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WebsiteLayout>
    </ProtectedLayout>
  );
}
