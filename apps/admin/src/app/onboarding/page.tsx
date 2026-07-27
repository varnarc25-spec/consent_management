'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const STEPS = [
  'Welcome',
  'Email verified',
  'Organization',
  'Regulation',
  'Add domain',
  'Verify domain',
  'First scan',
  'Banner setup',
  'Install script',
  'Validate',
];

interface Domain {
  id: string;
  hostname: string;
  verificationStatus: string;
}

interface ValidationResult {
  overallStatus: string;
  checks: Array<{ id: string; label: string; status: string; message: string; remediation?: string }>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [domain, setDomain] = useState<Domain | null>(null);
  const [installSnippet, setInstallSnippet] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [orgData, setOrgData] = useState({
    name: '',
    legalName: '',
    businessType: '',
    country: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultLanguage: 'en',
    defaultRegulation: 'GDPR',
    billingEmail: '',
    technicalContact: '',
    privacyContact: '',
    dpoDetails: '',
  });

  useEffect(() => {
    apiFetch<{
      step: number;
      complete: boolean;
      hasOrganization: boolean;
      organization?: Partial<typeof orgData>;
    }>('/organizations/me/onboarding').then((r) => {
      if (r.data?.complete) {
        router.replace('/dashboard');
      } else {
        if (r.data?.step) setStep(Math.max(1, r.data.step));
        if (r.data?.organization) {
          setOrgData((prev) => ({ ...prev, ...r.data!.organization }));
        }
      }
    });
  }, [router]);

  async function saveStep(nextStep: number, profile?: Partial<typeof orgData>, complete = false) {
    setError('');
    const sanitizedProfile = profile
      ? Object.fromEntries(
          Object.entries(profile).filter(([, value]) => value !== '' && value !== undefined),
        )
      : undefined;

    const result = await apiFetch('/organizations/me/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({
        step: nextStep,
        complete,
        ...(sanitizedProfile && Object.keys(sanitizedProfile).length > 0
          ? { profile: sanitizedProfile }
          : {}),
      }),
    });

    if (!result.ok) {
      setError(result.error?.message ?? 'Failed to save progress');
      return false;
    }

    setStep(nextStep);
    return true;
  }

  async function createOrg(e: FormEvent) {
    e.preventDefault();
    setError('');
    const result = await apiFetch('/organizations', {
      method: 'POST',
      body: JSON.stringify({
        name: orgData.name,
        legalName: orgData.legalName || undefined,
        businessType: orgData.businessType || undefined,
        country: orgData.country || undefined,
        timezone: orgData.timezone,
        defaultLanguage: orgData.defaultLanguage,
        billingEmail: orgData.billingEmail || undefined,
      }),
    });
    if (!result.ok) {
      setError(result.error?.message ?? 'Failed to create organization');
      return;
    }
    await saveStep(4, orgData);
  }

  async function addDomain(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await apiFetch<Domain>('/domains', {
      method: 'POST',
      body: JSON.stringify({ hostname: form.get('hostname'), domainType: 'ROOT' }),
    });
    if (!result.ok || !result.data) {
      setError(result.error?.message ?? 'Failed to add domain');
      return;
    }
    setDomain(result.data);
    await saveStep(6);
  }

  async function verifyDomain() {
    if (!domain) return;
    const result = await apiFetch<{ verified: boolean; message: string }>(
      `/domains/${domain.id}/verify`,
      { method: 'POST', body: JSON.stringify({ method: 'MANUAL' }) },
    );
    setMessage(result.data?.message ?? '');
    if (result.data?.verified) {
      setDomain({ ...domain, verificationStatus: 'VERIFIED' });
      await saveStep(7);
    }
  }

  useEffect(() => {
    if (step === 9 && domain) {
      apiFetch<{ snippet: string }>(`/domains/${domain.id}/installation-script`).then((r) => {
        if (r.data) setInstallSnippet(r.data.snippet);
      });
    }
  }, [step, domain]);

  async function runValidation() {
    if (!domain) return;
    setValidating(true);
    setError('');
    const result = await apiFetch<ValidationResult>(`/domains/${domain.id}/validate-installation`, {
      method: 'POST',
    });
    setValidating(false);
    if (result.data) {
      setValidation(result.data);
      setMessage(`Validation complete: ${result.data.overallStatus}`);
    } else {
      setError(result.error?.message ?? 'Validation failed');
    }
  }

  async function finish() {
    if (!validation && domain) {
      await runValidation();
    }
    await saveStep(10, undefined, true);
    router.push('/dashboard');
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 640, margin: '2rem auto' }}>
        <h1>Onboarding</h1>
        <p style={{ color: 'var(--muted)' }}>
          Step {step} of 10 — {STEPS[step - 1]}
        </p>
        <div style={{ display: 'flex', gap: 4, margin: '1rem 0' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: step > i ? 'var(--primary)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2>Welcome to CMP</h2>
            <p>Your account is ready. Let&apos;s set up your organization and first website.</p>
            <button className="btn" type="button" onClick={() => setStep(2)}>Get started</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>Email verified</h2>
            <p className="success">Your email address has been verified.</p>
            <button className="btn" type="button" onClick={() => setStep(3)}>Continue</button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={createOrg}>
            <h2>Organization details</h2>
            <div className="field">
              <label htmlFor="name">Organization name *</label>
              <input id="name" value={orgData.name} onChange={(e) => setOrgData({ ...orgData, name: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="legalName">Legal name</label>
              <input id="legalName" value={orgData.legalName} onChange={(e) => setOrgData({ ...orgData, legalName: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="businessType">Business type</label>
              <input id="businessType" value={orgData.businessType} onChange={(e) => setOrgData({ ...orgData, businessType: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="billingEmail">Billing email</label>
              <input id="billingEmail" type="email" value={orgData.billingEmail} onChange={(e) => setOrgData({ ...orgData, billingEmail: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="timezone">Time zone</label>
              <input id="timezone" value={orgData.timezone} onChange={(e) => setOrgData({ ...orgData, timezone: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="defaultLanguage">Default language</label>
              <input id="defaultLanguage" maxLength={10} value={orgData.defaultLanguage} onChange={(e) => setOrgData({ ...orgData, defaultLanguage: e.target.value })} />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit">Create organization</button>
          </form>
        )}

        {step === 4 && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              await saveStep(5, orgData);
            }}
          >
            <h2>Country & regulation</h2>
            <div className="field">
              <label htmlFor="country">Country (2-letter code)</label>
              <input
                id="country"
                maxLength={2}
                placeholder="US"
                value={orgData.country}
                onChange={(e) => setOrgData({ ...orgData, country: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="field">
              <label htmlFor="defaultRegulation">Default regulation</label>
              <select id="defaultRegulation" value={orgData.defaultRegulation} onChange={(e) => setOrgData({ ...orgData, defaultRegulation: e.target.value })}>
                {['GDPR', 'CCPA', 'LGPD', 'PIPEDA', 'OTHER'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="technicalContact">Technical contact</label>
              <input id="technicalContact" type="email" value={orgData.technicalContact} onChange={(e) => setOrgData({ ...orgData, technicalContact: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="privacyContact">Privacy contact</label>
              <input id="privacyContact" type="email" value={orgData.privacyContact} onChange={(e) => setOrgData({ ...orgData, privacyContact: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="dpoDetails">Data protection officer</label>
              <textarea
                id="dpoDetails"
                rows={3}
                value={orgData.dpoDetails}
                onChange={(e) => setOrgData({ ...orgData, dpoDetails: e.target.value })}
                placeholder="Name, email, or appointment details"
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit">Continue</button>
          </form>
        )}

        {step === 5 && (
          <form onSubmit={addDomain}>
            <h2>Add your first website</h2>
            <div className="field">
              <label htmlFor="hostname">Domain</label>
              <input id="hostname" name="hostname" placeholder="example.com" required />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit">Add domain</button>
          </form>
        )}

        {step === 6 && domain && (
          <div>
            <h2>Domain registered</h2>
            <p>
              Domain: <strong>{domain.hostname}</strong>{' '}
              <span className={domain.verificationStatus === 'VERIFIED' ? 'success' : ''}>
                ({domain.verificationStatus})
              </span>
            </p>
            {domain.verificationStatus === 'VERIFIED' ? (
              <p className="success" style={{ marginTop: '0.75rem' }}>
                This domain was verified automatically when you added it. No DNS, meta tag, or extra
                scripts are required on your website.
              </p>
            ) : (
              <>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  Verification is pending. It will complete automatically when the CMP script loads on
                  your site, or you can verify from the domain detail page.
                </p>
                {message && <p className="success">{message}</p>}
                <button className="btn btn-secondary" type="button" onClick={verifyDomain}>
                  Verify now
                </button>
              </>
            )}
            <button className="btn" type="button" style={{ marginTop: '1rem' }} onClick={() => saveStep(7)}>
              Continue
            </button>
          </div>
        )}

        {step === 7 && (
          <div>
            <h2>First scan</h2>
            <p style={{ color: 'var(--muted)' }}>Website scanning ships in Sprint 8. You can continue setup.</p>
            <button className="btn" type="button" onClick={() => saveStep(8)}>Continue</button>
          </div>
        )}

        {step === 8 && domain && (
          <div>
            <h2>Configure banner</h2>
            <p>Define consent categories and banner content for your domain.</p>
            <p style={{ color: 'var(--muted)' }}>
              You can configure categories, publish a policy version, and set banner text before going live.
            </p>
            <Link className="btn btn-secondary" href={`/domains/${domain.id}/consent`} style={{ display: 'inline-block', marginTop: '1rem' }}>
              Open consent configuration
            </Link>
            <button className="btn" type="button" style={{ marginLeft: '1rem' }} onClick={() => saveStep(9)}>
              Continue
            </button>
          </div>
        )}

        {step === 9 && (
          <div>
            <h2>Install CMP script</h2>
            <pre style={{ background: 'var(--surface-muted)', padding: '1rem', borderRadius: 8, fontSize: '0.75rem', overflow: 'auto' }}>
              {installSnippet || 'Loading snippet...'}
            </pre>
            <button className="btn" type="button" style={{ marginTop: '1rem' }} onClick={() => saveStep(10)}>
              I&apos;ve installed the script
            </button>
          </div>
        )}

        {step === 10 && (
          <div>
            <h2>Validate installation</h2>
            <p>Run installation validation to confirm the CMP script is working.</p>
            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}
            <button className="btn btn-secondary" type="button" onClick={runValidation} disabled={validating}>
              {validating ? 'Validating...' : 'Run validation'}
            </button>
            {validation && (
              <table style={{ marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.checks.map((c) => (
                    <tr key={c.id}>
                      <td>{c.label}</td>
                      <td>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn" type="button" style={{ marginTop: '1rem' }} onClick={finish}>
              Complete onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
