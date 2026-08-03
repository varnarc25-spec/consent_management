'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { apiFetch } from '@/lib/api';
import { getWebUrl } from '@/lib/web-url';

interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  country?: string | null;
  timezone?: string | null;
  defaultRegulation?: string | null;
  billingEmail?: string | null;
  storeConsentIpAddress?: boolean;
  geoTargetingDisabled?: boolean;
  status: string;
}

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [permanentName, setPermanentName] = useState('');

  useEffect(() => {
    apiFetch<Organization | null>('/organizations/me').then((r) => {
      if (r.data) setOrg(r.data);
      setLoading(false);
    });
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await apiFetch<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name') }),
    });
    if (result.ok && result.data) {
      setOrg(result.data);
      setMessage('Organization created');
      setError('');
    } else {
      setError(result.error?.message ?? 'Failed to create organization');
    }
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await apiFetch<Organization>('/organizations/me', {
      method: 'PATCH',
      body: JSON.stringify({
        name: form.get('name'),
        legalName: form.get('legalName') || undefined,
        country: form.get('country') || undefined,
        timezone: form.get('timezone') || undefined,
        billingEmail: form.get('billingEmail') || undefined,
        defaultRegulation: form.get('defaultRegulation') || undefined,
        storeConsentIpAddress: form.get('storeConsentIpAddress') === 'on',
        geoTargetingDisabled: form.get('geoTargetingDisabled') === 'on',
      }),
    });
    if (result.ok && result.data) {
      setOrg(result.data);
      setEditing(false);
      setMessage('Organization updated');
      setError('');
    } else {
      setError(result.error?.message ?? 'Update failed');
    }
  }

  async function onSoftDelete() {
    if (deleteConfirm !== 'DELETE') {
      setError('Type DELETE to confirm soft delete');
      return;
    }
    const result = await apiFetch('/organizations/me', { method: 'DELETE' });
    if (result.ok) {
      window.location.assign(`${getWebUrl()}/dashboard`);
    } else {
      setError(result.error?.message ?? 'Delete failed');
    }
  }

  async function onPermanentDelete() {
    if (!org) return;
    const result = await apiFetch('/organizations/me/permanent', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE', organizationName: permanentName }),
    });
    if (result.ok) {
      window.location.assign(`${getWebUrl()}/dashboard`);
    } else {
      setError(result.error?.message ?? 'Permanent delete failed');
    }
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <LoadingScreen message="Loading organization…" inline />
      </ProtectedLayout>
    );
  }

  if (!org) {
    return (
      <ProtectedLayout>
        <h1>Organization</h1>
        <p style={{ color: 'var(--muted)' }}>
          Create an organization to manage domains and team settings. Optional profile fields can be
          added later from the web portal dashboard.
        </p>
        <form className="card" style={{ marginTop: '1.5rem', maxWidth: 520 }} onSubmit={onCreate}>
          <h3>Create organization</h3>
          <div className="field">
            <label htmlFor="name">Organization name *</label>
            <input id="name" name="name" required minLength={2} placeholder="Your company or team" />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit">Create organization</button>
        </form>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <h1>Organization</h1>

      {!editing ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>{org.name}</h3>
          <p style={{ color: 'var(--muted)' }}>Slug: {org.slug} · Status: {org.status}</p>
          {org.legalName && <p>Legal name: {org.legalName}</p>}
          {org.country && <p>Country: {org.country}</p>}
          {org.timezone && <p>Timezone: {org.timezone}</p>}
          {org.billingEmail && <p>Billing: {org.billingEmail}</p>}
          <p>Store consent IP (hashed): {org.storeConsentIpAddress ? 'Yes' : 'No'}</p>
          {org.defaultRegulation && <p>Default regulation: {org.defaultRegulation}</p>}
          <p>Server geo targeting: {org.geoTargetingDisabled ? 'Disabled' : 'Enabled'}</p>
          <button className="btn" style={{ marginTop: '1rem' }} onClick={() => setEditing(true)}>
            Edit organization
          </button>
        </div>
      ) : (
        <form className="card" style={{ marginTop: '1.5rem', maxWidth: 520 }} onSubmit={onUpdate}>
          <h3>Edit organization</h3>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={org.name} required />
          </div>
          <div className="field">
            <label htmlFor="legalName">Legal name</label>
            <input id="legalName" name="legalName" defaultValue={org.legalName ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="country">Country</label>
            <input id="country" name="country" defaultValue={org.country ?? ''} maxLength={2} />
          </div>
          <div className="field">
            <label htmlFor="timezone">Timezone</label>
            <input id="timezone" name="timezone" defaultValue={org.timezone ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="defaultRegulation">Default regulation</label>
            <select id="defaultRegulation" name="defaultRegulation" defaultValue={org.defaultRegulation ?? 'GDPR'}>
              <option value="GDPR">GDPR</option>
              <option value="CCPA">CCPA</option>
              <option value="LGPD">LGPD</option>
              <option value="PIPEDA">PIPEDA</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="billingEmail">Billing email</label>
            <input
              id="billingEmail"
              name="billingEmail"
              type="email"
              defaultValue={org.billingEmail ?? ''}
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                name="geoTargetingDisabled"
                defaultChecked={org.geoTargetingDisabled ?? false}
              />
              Disable server-side geo detection (use client hints only)
            </label>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                name="storeConsentIpAddress"
                defaultChecked={org.storeConsentIpAddress ?? true}
              />
              Store hashed IP address on consent records
            </label>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn" type="submit">Save</button>
            <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && <p className="success" style={{ marginTop: '1rem' }}>{message}</p>}
      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      <div className="card" style={{ marginTop: '1.5rem', borderColor: 'var(--danger)' }}>
        <h3>Danger zone</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Soft delete marks the organization as deleted. Permanent delete removes all data irreversibly.
        </p>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="softDelete">Type DELETE for soft delete</label>
          <input id="softDelete" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={onSoftDelete} type="button">
          Soft delete organization
        </button>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="permName">Type organization name for permanent delete</label>
          <input id="permName" value={permanentName} onChange={(e) => setPermanentName(e.target.value)} />
        </div>
        <button
          className="btn"
          style={{ background: 'var(--danger)' }}
          onClick={onPermanentDelete}
          type="button"
        >
          Permanently delete organization
        </button>
      </div>
    </ProtectedLayout>
  );
}
