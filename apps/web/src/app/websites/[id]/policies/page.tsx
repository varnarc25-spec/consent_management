'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { WebsiteScanStatus } from '@/components/website-scan-context';
import { apiFetch } from '@/lib/api';

interface Policy {
  id: string;
  versionNumber: number;
  status: string;
  publishedAt: string | null;
}

export default function LegalPoliciesPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [hostname, setHostname] = useState('');
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    apiFetch<{ hostname: string }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (r.data) setHostname(r.data.hostname);
    });
    apiFetch<Policy[]>(`/domains/${domainId}/consent/policies`, { silent: true }).then((r) => {
      if (r.data) setPolicies(r.data);
    });
  }, [domainId]);

  return (
    <ProtectedLayout>
      <WebsiteLayout domainId={domainId} hostname={hostname || undefined}>
        <div className="website-page-header website-page-header-end">
          <WebsiteScanStatus />
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ marginTop: 0 }}>Legal Policies</h2>
          <p className="website-section-muted">
            Published consent policy versions for {hostname || 'this website'}.
          </p>
          {policies.length === 0 ? (
            <p className="website-section-muted">No policies yet.</p>
          ) : (
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td>v{p.versionNumber}</td>
                    <td>{p.status}</td>
                    <td>{p.publishedAt ? new Date(p.publishedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: '1rem' }}>
            <Link className="btn" href={`/websites/${domainId}/consent`}>
              Manage in Cookie Banner
            </Link>
          </p>
        </div>
      </WebsiteLayout>
    </ProtectedLayout>
  );
}
