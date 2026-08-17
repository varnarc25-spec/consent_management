'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { WebsiteScanStatus, useWebsiteScan } from '@/components/website-scan-context';
import { apiFetch } from '@/lib/api';

function ReportsBody({ domainId }: { domainId: string }) {
  const websiteScan = useWebsiteScan();
  const scans = websiteScan?.scans ?? [];
  const completed = scans.filter((s) => s.status === 'COMPLETED').length;
  const failed = scans.filter((s) => s.status === 'FAILED').length;

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h2 style={{ marginTop: 0 }}>Reports</h2>
      <div className="wd-stat-pair" style={{ maxWidth: 420 }}>
        <div>
          <strong>{completed}</strong>
          <span>Completed scans</span>
        </div>
        <div>
          <strong>{failed}</strong>
          <span>Failed scans</span>
        </div>
      </div>
      <p className="website-section-muted" style={{ marginTop: '1rem' }}>
        Open scan history for detailed crawl results, or Cookie Manager for inventory exports.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <Link className="btn" href={`/websites/${domainId}/scans`}>
          View scans
        </Link>
        <Link className="btn btn-secondary" href={`/websites/${domainId}/cookies`}>
          Cookie Manager
        </Link>
        <Link className="btn btn-secondary" href={`/websites/${domainId}/consent-log`}>
          Consent Log
        </Link>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [hostname, setHostname] = useState('');

  useEffect(() => {
    apiFetch<{ hostname: string }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (r.data) setHostname(r.data.hostname);
    });
  }, [domainId]);

  return (
    <ProtectedLayout>
      <WebsiteLayout domainId={domainId} hostname={hostname || undefined}>
        <div className="website-page-header website-page-header-end">
          <WebsiteScanStatus />
        </div>
        <ReportsBody domainId={domainId} />
      </WebsiteLayout>
    </ProtectedLayout>
  );
}
