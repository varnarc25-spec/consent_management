'use client';

import { ProtectedLayout } from '@/components/protected-layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CurrentUser } from '@cmp/types';
import { apiFetch } from '@/lib/api';
import { getAdminUrl } from '@/lib/admin-url';

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const adminUrl = getAdminUrl();

  useEffect(() => {
    apiFetch<CurrentUser>('/auth/me').then((r) => {
      if (r.data) setUser(r.data);
    });
  }, []);

  return (
    <ProtectedLayout>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>Welcome to the Consent Management Platform.</p>

      <div className="grid-2" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h3>Organization</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            {user?.organizationId
              ? 'Your organization is set up.'
              : 'Create your organization to get started.'}
          </p>
          <Link
            className="btn"
            href={user?.organizationId ? `${adminUrl}/organization` : '/onboarding'}
            style={{ marginTop: '1rem' }}
          >
            {user?.organizationId ? 'Manage organization' : 'Create organization'}
          </Link>
        </div>
        <div className="card">
          <h3>Consent management</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Configure domains, banners, and consent policies in the admin console.
          </p>
          <a className="btn btn-secondary" href={`${adminUrl}/domains`} style={{ marginTop: '1rem' }}>
            Open admin console
          </a>
        </div>
      </div>
    </ProtectedLayout>
  );
}
