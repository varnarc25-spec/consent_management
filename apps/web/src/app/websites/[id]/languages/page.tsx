'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { WebsiteScanStatus } from '@/components/website-scan-context';
import { apiFetch } from '@/lib/api';

export default function LanguagesPage() {
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
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Languages</h2>
          <p className="website-section-muted">
            Banner and preference-center languages for {hostname || 'this website'}.
          </p>
          <ul style={{ margin: '1rem 0', paddingLeft: '1.25rem' }}>
            <li>English (default)</li>
          </ul>
          <p className="website-section-muted">
            Configure multi-language banner copy in Cookie Banner settings.
          </p>
          <Link className="btn" href={`/websites/${domainId}/consent`}>
            Open Cookie Banner
          </Link>
        </div>
      </WebsiteLayout>
    </ProtectedLayout>
  );
}
