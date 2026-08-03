'use client';

import Link from 'next/link';
import { ProtectedLayout } from '@/components/protected-layout';
import { AddDomainForm } from '@/components/add-domain-form';
import { websiteSetupProgress } from '@/components/website-setup-steps';
import { useEffect, useState } from 'react';
import type { CurrentUser } from '@cmp/types';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  verificationStatus: string;
  domainType: string;
  enabled: boolean;
  sdkLastSeenAt?: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showDomainForm, setShowDomainForm] = useState(false);
  const [message, setMessage] = useState('');

  function loadDomains() {
    apiFetch<Domain[]>('/domains').then((r) => {
      if (r.data) setDomains(r.data);
    });
  }

  useEffect(() => {
    apiFetch<CurrentUser>('/auth/me').then((r) => {
      if (r.data) setUser(r.data);
    });
    loadDomains();
  }, []);

  function handleDomainAdded() {
    setShowDomainForm(false);
    setMessage('Website added successfully.');
    loadDomains();
    apiFetch<CurrentUser>('/auth/me').then((r) => {
      if (r.data) setUser(r.data);
    });
  }

  const verifiedCount = domains.filter((d) => d.verificationStatus === 'VERIFIED').length;

  return (
    <ProtectedLayout>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Welcome{user ? `, ${user.firstName}` : ''}. Add websites and complete the required setup for each one.
          </p>
        </div>
        <button className="btn" type="button" onClick={() => setShowDomainForm((v) => !v)}>
          {showDomainForm ? 'Cancel' : 'Add website'}
        </button>
      </div>

      {message && <p className="success page-alert">{message}</p>}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Organization</span>
          <span className="stat-value">{user?.organizationId ? 'Active' : 'Not created'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Websites</span>
          <span className="stat-value">{domains.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verified</span>
          <span className="stat-value">{verifiedCount}</span>
        </div>
      </div>

      {showDomainForm && (
        <AddDomainForm
          hasOrganization={Boolean(user?.organizationId)}
          onSuccess={handleDomainAdded}
          onCancel={() => setShowDomainForm(false)}
        />
      )}

      <div className="card" style={{ marginTop: showDomainForm ? '1rem' : 0, overflowX: 'auto' }}>
        <div className="card-header">
          <h2>Websites</h2>
          <span className="card-meta">{domains.length} total</span>
        </div>
        {domains.length === 0 ? (
          <div className="empty-state-block">
            <p className="empty-state">
              No websites yet. Each website requires setup: verify domain, scan, consent banner, install script, and validation.
            </p>
            <button className="btn" type="button" onClick={() => setShowDomainForm(true)} style={{ marginTop: '1rem' }}>
              Add your first website
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>Type</th>
                <th>Verification</th>
                <th>Setup</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => {
                const progress = websiteSetupProgress(domain.verificationStatus, domain.sdkLastSeenAt);
                return (
                  <tr key={domain.id}>
                    <td>
                      <strong>{domain.hostname}</strong>
                    </td>
                    <td>{domain.domainType}</td>
                    <td>
                      <span className={`status-pill status-${domain.verificationStatus.toLowerCase()}`}>
                        {domain.verificationStatus}
                      </span>
                    </td>
                    <td>
                      <Link href={`/websites/${domain.id}`} className="setup-table-link">
                        {progress.completed}/{progress.total} steps
                      </Link>
                    </td>
                    <td>{domain.enabled ? 'Enabled' : 'Disabled'}</td>
                    <td>
                      <Link href={`/websites/${domain.id}`}>Setup</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </ProtectedLayout>
  );
}
