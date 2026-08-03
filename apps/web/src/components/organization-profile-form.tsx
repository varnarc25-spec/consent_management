'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const REGULATIONS = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'OTHER'] as const;

interface Organization {
  name: string;
  legalName: string | null;
  businessType: string | null;
  country: string | null;
  timezone: string | null;
  defaultLanguage: string | null;
  defaultRegulation: string | null;
  billingEmail: string | null;
  technicalContact: string | null;
  privacyContact: string | null;
  dpoDetails: string | null;
}

const emptyProfile = {
  name: '',
  legalName: '',
  businessType: '',
  billingEmail: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  defaultLanguage: 'en',
  country: '',
  defaultRegulation: 'GDPR' as (typeof REGULATIONS)[number],
  technicalContact: '',
  privacyContact: '',
  dpoDetails: '',
};

export function OrganizationProfileForm() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Organization>('/organizations/me').then((r) => {
      if (r.data) {
        setProfile({
          name: r.data.name ?? '',
          legalName: r.data.legalName ?? '',
          businessType: r.data.businessType ?? '',
          billingEmail: r.data.billingEmail ?? '',
          timezone: r.data.timezone ?? emptyProfile.timezone,
          defaultLanguage: r.data.defaultLanguage ?? 'en',
          country: r.data.country ?? '',
          defaultRegulation: (r.data.defaultRegulation as (typeof REGULATIONS)[number]) ?? 'GDPR',
          technicalContact: r.data.technicalContact ?? '',
          privacyContact: r.data.privacyContact ?? '',
          dpoDetails: r.data.dpoDetails ?? '',
        });
      }
      setLoading(false);
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const result = await apiFetch('/organizations/me', {
      method: 'PATCH',
      body: JSON.stringify({
        name: profile.name,
        legalName: profile.legalName || undefined,
        businessType: profile.businessType || undefined,
        billingEmail: profile.billingEmail || undefined,
        timezone: profile.timezone || undefined,
        defaultLanguage: profile.defaultLanguage || undefined,
        country: profile.country || undefined,
        defaultRegulation: profile.defaultRegulation,
        technicalContact: profile.technicalContact || undefined,
        privacyContact: profile.privacyContact || undefined,
        dpoDetails: profile.dpoDetails || undefined,
      }),
    });

    setSaving(false);
    if (result.ok) {
      setMessage('Organization updated.');
    } else {
      setError(result.error?.message ?? 'Failed to save organization');
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--muted)' }}>Loading organization…</p>;
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <h3 style={{ marginTop: '1.5rem' }}>Organization profile</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
        Legal name, billing email, timezone, and other company details.
      </p>
      <div className="field">
        <label htmlFor="org-name">Organization name *</label>
        <input
          id="org-name"
          required
          minLength={2}
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="org-legalName">Legal name</label>
        <input
          id="org-legalName"
          value={profile.legalName}
          onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="org-businessType">Business type</label>
        <input
          id="org-businessType"
          placeholder="e.g. SaaS, E-commerce"
          value={profile.businessType}
          onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
        />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="org-billingEmail">Billing email</label>
          <input
            id="org-billingEmail"
            type="email"
            value={profile.billingEmail}
            onChange={(e) => setProfile({ ...profile, billingEmail: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="org-timezone">Timezone</label>
          <input
            id="org-timezone"
            value={profile.timezone}
            onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="org-defaultLanguage">Default language</label>
        <input
          id="org-defaultLanguage"
          value={profile.defaultLanguage}
          onChange={(e) => setProfile({ ...profile, defaultLanguage: e.target.value })}
        />
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Country &amp; regulation</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
        GDPR, CCPA, contacts, and DPO details apply to all websites in your organization.
      </p>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="org-country">Country (ISO code)</label>
          <input
            id="org-country"
            maxLength={2}
            placeholder="US"
            value={profile.country}
            onChange={(e) => setProfile({ ...profile, country: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="field">
          <label htmlFor="org-defaultRegulation">Primary regulation</label>
          <select
            id="org-defaultRegulation"
            value={profile.defaultRegulation}
            onChange={(e) =>
              setProfile({
                ...profile,
                defaultRegulation: e.target.value as (typeof REGULATIONS)[number],
              })
            }
          >
            {REGULATIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="org-technicalContact">Technical contact</label>
        <input
          id="org-technicalContact"
          value={profile.technicalContact}
          onChange={(e) => setProfile({ ...profile, technicalContact: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="org-privacyContact">Privacy contact</label>
        <input
          id="org-privacyContact"
          value={profile.privacyContact}
          onChange={(e) => setProfile({ ...profile, privacyContact: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="org-dpoDetails">DPO details</label>
        <textarea
          id="org-dpoDetails"
          rows={3}
          value={profile.dpoDetails}
          onChange={(e) => setProfile({ ...profile, dpoDetails: e.target.value })}
        />
      </div>

      <button className="btn" type="submit" disabled={saving} style={{ marginTop: '0.5rem' }}>
        {saving ? 'Saving…' : 'Save organization'}
      </button>
    </form>
  );
}
