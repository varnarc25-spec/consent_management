'use client';

import { ProtectedLayout } from '@/components/protected-layout';
import { AddDomainForm } from '@/components/add-domain-form';
import { SetupGuide } from '@/components/setup-guide';
import { useEffect, useState } from 'react';
import type { CurrentUser } from '@cmp/types';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { getAdminUrl } from '@/lib/admin-url';

interface Domain {
  id: string;
  hostname: string;
  verificationStatus: string;
  domainType: string;
  enabled: boolean;
}

export default function DashboardPage() {
  const adminUrl = getAdminUrl();
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
            Welcome{user ? `, ${user.firstName}` : ''}. Manage websites and track your consent setup.
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

      <div className="panel-grid">
        <section className="panel-main">
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
              <p className="empty-state">
                No websites registered yet. Click <strong>Add website</strong> to get started.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Hostname</th>
                    <th>Type</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain) => (
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
                      <td>{domain.enabled ? 'Enabled' : 'Disabled'}</td>
                      <td>
                        <Link href={`${adminUrl}/domains/${domain.id}`}>Manage</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <aside className="panel-side">
          <SetupGuide
            hasOrganization={Boolean(user?.organizationId)}
            hasDomains={domains.length > 0}
            adminUrl={adminUrl}
            onAddDomain={() => setShowDomainForm(true)}
          />
        </aside>
      </div>
    </ProtectedLayout>
  );
}
