'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { apiFetch } from '@/lib/api';

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

interface OnboardingState {
  step: number;
  complete: boolean;
  hasOrganization: boolean;
  organization?: Organization | null;
  domainCount?: number;
}

const STEPS = [
  { id: 1, title: 'Organization profile' },
  { id: 2, title: 'Regulation & contacts' },
  { id: 3, title: 'Add a website' },
  { id: 4, title: 'Complete' },
];

const REGULATIONS = ['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'OTHER'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [domainCount, setDomainCount] = useState(0);
  const [profile, setProfile] = useState({
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
  });

  useEffect(() => {
    async function load() {
      const result = await apiFetch<OnboardingState>('/organizations/me/onboarding');
      if (result.data) {
        if (result.data.complete) {
          router.replace('/dashboard');
          return;
        }
        const currentStep = Math.min(Math.max(result.data.step, 1), 4);
        setStep(currentStep);
        setHasOrganization(result.data.hasOrganization);
        setDomainCount(result.data.domainCount ?? 0);
        if (result.data.organization) {
          const org = result.data.organization;
          setProfile({
            name: org.name ?? '',
            legalName: org.legalName ?? '',
            businessType: org.businessType ?? '',
            billingEmail: org.billingEmail ?? '',
            timezone: org.timezone ?? profile.timezone,
            defaultLanguage: org.defaultLanguage ?? 'en',
            country: org.country ?? '',
            defaultRegulation: (org.defaultRegulation as (typeof REGULATIONS)[number]) ?? 'GDPR',
            technicalContact: org.technicalContact ?? '',
            privacyContact: org.privacyContact ?? '',
            dpoDetails: org.dpoDetails ?? '',
          });
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  function profilePayload() {
    return {
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
    };
  }

  async function saveStep(nextStep: number, complete = false) {
    setSaving(true);
    setError('');

    if (!hasOrganization && step === 1) {
      const orgResult = await apiFetch('/organizations', {
        method: 'POST',
        body: JSON.stringify(profilePayload()),
      });
      if (!orgResult.ok) {
        setError(orgResult.error?.message ?? 'Failed to create organization');
        setSaving(false);
        return;
      }
      await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
      setHasOrganization(true);
    }

    const patchResult = await apiFetch('/organizations/me/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({
        step: nextStep,
        complete,
        profile: profilePayload(),
      }),
    });

    setSaving(false);

    if (!patchResult.ok) {
      setError(patchResult.error?.message ?? 'Failed to save progress');
      return;
    }

    if (complete) {
      router.replace('/dashboard');
      return;
    }

    setStep(nextStep);
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (profile.name.trim().length < 2) {
      setError('Organization name must be at least 2 characters.');
      return;
    }
    await saveStep(2);
  }

  async function handleRegulationSubmit(e: FormEvent) {
    e.preventDefault();
    await saveStep(3);
  }

  async function handleDomainHintContinue() {
    await saveStep(4);
  }

  async function handleComplete() {
    await saveStep(4, true);
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <LoadingScreen message="Loading onboarding…" inline />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="page-header">
        <div>
          <h1>Welcome</h1>
          <p className="page-subtitle">Set up your organization in a few quick steps.</p>
        </div>
      </div>

      <ol
        style={{
          display: 'flex',
          gap: '0.5rem',
          listStyle: 'none',
          padding: 0,
          margin: '0 0 1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {STEPS.map((s) => (
          <li
            key={s.id}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: 999,
              fontSize: '0.8125rem',
              fontWeight: 500,
              background: s.id === step ? 'var(--primary)' : 'var(--surface-muted)',
              color: s.id === step ? 'white' : 'var(--muted)',
              border: s.id < step ? '1px solid #bbf7d0' : '1px solid var(--border)',
            }}
          >
            {s.id}. {s.title}
          </li>
        ))}
      </ol>

      {error && <p className="error">{error}</p>}

      {step === 1 && (
        <form className="card" onSubmit={handleProfileSubmit} style={{ maxWidth: 560 }}>
          <h3>Organization profile</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Tell us about your company. You can update these later in settings.
          </p>
          <div className="field">
            <label htmlFor="name">Organization name *</label>
            <input
              id="name"
              required
              minLength={2}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="legalName">Legal name</label>
            <input
              id="legalName"
              value={profile.legalName}
              onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="businessType">Business type</label>
            <input
              id="businessType"
              placeholder="e.g. SaaS, E-commerce"
              value={profile.businessType}
              onChange={(e) => setProfile({ ...profile, businessType: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="billingEmail">Billing email</label>
              <input
                id="billingEmail"
                type="email"
                value={profile.billingEmail}
                onChange={(e) => setProfile({ ...profile, billingEmail: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="timezone">Timezone</label>
              <input
                id="timezone"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="defaultLanguage">Default language</label>
            <input
              id="defaultLanguage"
              value={profile.defaultLanguage}
              onChange={(e) => setProfile({ ...profile, defaultLanguage: e.target.value })}
            />
          </div>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form className="card" onSubmit={handleRegulationSubmit} style={{ maxWidth: 560 }}>
          <h3>Regulation & contacts</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Choose your primary privacy regulation and optional contact details.
          </p>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="country">Country (ISO code)</label>
              <input
                id="country"
                maxLength={2}
                placeholder="US"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="field">
              <label htmlFor="defaultRegulation">Primary regulation</label>
              <select
                id="defaultRegulation"
                value={profile.defaultRegulation}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    defaultRegulation: e.target.value as (typeof REGULATIONS)[number],
                  })
                }
              >
                {REGULATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="technicalContact">Technical contact email</label>
            <input
              id="technicalContact"
              type="email"
              value={profile.technicalContact}
              onChange={(e) => setProfile({ ...profile, technicalContact: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="privacyContact">Privacy contact email</label>
            <input
              id="privacyContact"
              type="email"
              value={profile.privacyContact}
              onChange={(e) => setProfile({ ...profile, privacyContact: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="dpoDetails">DPO details</label>
            <textarea
              id="dpoDetails"
              rows={3}
              value={profile.dpoDetails}
              onChange={(e) => setProfile({ ...profile, dpoDetails: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3>Add a website</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Register the domain where you will install the consent banner. You can add websites from
            the dashboard at any time.
          </p>
          {domainCount > 0 ? (
            <p className="success">You already have {domainCount} website{domainCount === 1 ? '' : 's'} registered.</p>
          ) : (
            <p>
              No websites yet.{' '}
              <Link href="/dashboard">Go to the dashboard</Link> and click <strong>Add website</strong>{' '}
              when you are ready.
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn" type="button" disabled={saving} onClick={handleDomainHintContinue}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3>You&apos;re all set</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Your organization profile is saved. Head to the dashboard to add websites, run scans, and
            configure consent banners.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setStep(3)}>
              Back
            </button>
            <button className="btn" type="button" disabled={saving} onClick={handleComplete}>
              {saving ? 'Finishing…' : 'Go to dashboard'}
            </button>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}
