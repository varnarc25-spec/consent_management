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

  return (
    <ProtectedLayout>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Welcome{user ? `, ${user.firstName}` : ''}. Manage your consent platform from here.
      </p>

      {message && <p className="success" style={{ marginTop: '1rem' }}>{message}</p>}

      <SetupGuide
        hasOrganization={Boolean(user?.organizationId)}
        hasDomains={domains.length > 0}
        adminUrl={adminUrl}
        onAddDomain={() => setShowDomainForm(true)}
      />

      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your websites</h2>
          <button className="btn" type="button" onClick={() => setShowDomainForm((v) => !v)}>
            {showDomainForm ? 'Cancel' : 'Add website'}
          </button>
        </div>

        {showDomainForm && (
          <div style={{ marginTop: '1rem' }}>
            <AddDomainForm
              hasOrganization={Boolean(user?.organizationId)}
              onSuccess={handleDomainAdded}
              onCancel={() => setShowDomainForm(false)}
            />
          </div>
        )}

        <div className="card" style={{ marginTop: '1rem', overflowX: 'auto' }}>
          {domains.length === 0 ? (
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              No websites yet. Click <strong>Add website</strong> to register your first domain.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Type</th>
                  <th>Verification</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr key={domain.id}>
                    <td>{domain.hostname}</td>
                    <td>{domain.domainType}</td>
                    <td>{domain.verificationStatus}</td>
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
    </ProtectedLayout>
  );
}
