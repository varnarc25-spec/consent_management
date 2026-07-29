'use client';

import { FormEvent, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
}

export function AddDomainForm({
  hasOrganization,
  onSuccess,
  onCancel,
}: {
  hasOrganization: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orgName, setOrgName] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const hostname = String(form.get('hostname') ?? '').trim();
    const domainType = String(form.get('domainType') ?? 'ROOT');

    if (!hasOrganization) {
      const name = orgName.trim() || hostname;
      if (name.length < 2) {
        setError('Organization name must be at least 2 characters.');
        setSubmitting(false);
        return;
      }
      const orgResult = await apiFetch('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (!orgResult.ok) {
        setError(orgResult.error?.message ?? 'Failed to create organization');
        setSubmitting(false);
        return;
      }
      await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
    }

    const result = await apiFetch<Domain>('/domains', {
      method: 'POST',
      body: JSON.stringify({ hostname, domainType }),
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error?.message ?? 'Failed to add website');
      return;
    }

    onSuccess();
  }

  return (
    <form className="card add-domain-form" onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>Add website</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: 0 }}>
        Fields marked <strong>*</strong> are required for this website.
      </p>

      {!hasOrganization && (
        <div className="field">
          <label htmlFor="orgName">
            Organization name <span className="required">*</span>
          </label>
          <input
            id="orgName"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Your company or team name"
            required
            minLength={2}
          />
          <span className="field-hint">Required once before you can add websites.</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="hostname">
          Website domain <span className="required">*</span>
        </label>
        <input id="hostname" name="hostname" placeholder="example.com" required />
        <span className="field-hint">The root domain or subdomain where the CMP script will run.</span>
      </div>

      <div className="field">
        <label htmlFor="domainType">
          Domain type <span className="required">*</span>
        </label>
        <select id="domainType" name="domainType" defaultValue="ROOT" required>
          <option value="ROOT">Root domain (example.com)</option>
          <option value="SUBDOMAIN">Subdomain (www.example.com)</option>
          <option value="STAGING">Staging</option>
          <option value="ALIAS">Alias</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add website'}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
