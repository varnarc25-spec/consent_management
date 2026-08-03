'use client';

import Link from 'next/link';
import { ProtectedLayout } from '@/components/protected-layout';
import { OrganizationProfileForm } from '@/components/organization-profile-form';

export default function OrganizationSettingsPage() {
  return (
    <ProtectedLayout>
      <div className="page-header">
        <div>
          <h1>Organization</h1>
          <p className="page-subtitle">
            Company profile, regulation, and contacts shared across all websites.
          </p>
        </div>
      </div>

      <nav className="settings-subnav" aria-label="Settings sections">
        <Link href="/settings/organization" className="active">Organization</Link>
        <Link href="/settings">Security &amp; activity</Link>
      </nav>

      <div className="card" style={{ maxWidth: 640 }}>
        <OrganizationProfileForm />
      </div>
    </ProtectedLayout>
  );
}
