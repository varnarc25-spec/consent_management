'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { WebsiteSetupSteps } from '@/components/website-setup-steps';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
  domainType: string;
  verificationStatus: string;
  verificationMethod: string | null;
  verificationToken: string;
  environment: string;
  autoBlocking: boolean;
  debugMode: boolean;
  enabled: boolean;
  groupName: string | null;
  scanLimit: number;
  sdkLastSeenAt: string | null;
  isProduction: boolean;
}

interface InstallData {
  snippet: string;
  guides: Record<string, string>;
}

interface ValidationResult {
  overallStatus: string;
  checks: Array<{ id: string; label: string; status: string; message: string; remediation?: string }>;
}

interface HistoryItem {
  id: string;
  overallStatus: string;
  createdAt: string;
  checks: ValidationResult['checks'];
}

export default function DomainDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [instructions, setInstructions] = useState<Record<string, unknown> | null>(null);
  const [install, setInstall] = useState<InstallData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [guide, setGuide] = useState('html');
  const [settings, setSettings] = useState({
    enabled: true,
    groupName: '',
    scanLimit: 10,
    autoBlocking: true,
    debugMode: false,
  });

  const [loading, setLoading] = useState(true);

  async function loadDomain() {
    const r = await apiFetch<Domain>(`/domains/${id}`);
    if (r.data) {
      setDomain(r.data);
      setSettings({
        enabled: r.data.enabled,
        groupName: r.data.groupName ?? '',
        scanLimit: r.data.scanLimit,
        autoBlocking: r.data.autoBlocking,
        debugMode: r.data.debugMode,
      });
      setError('');
    } else if (!domain) {
      setError(r.error?.message ?? 'Website not found');
    }
    return r;
  }

  function loadHistory() {
    apiFetch<HistoryItem[]>(`/domains/${id}/validation-history`).then((r) => {
      if (r.data) setHistory(r.data);
    });
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError('');
      await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
      await loadDomain();
      loadHistory();
      apiFetch<Record<string, unknown>>(`/domains/${id}/verification-instructions`).then((r) => {
        if (r.data) setInstructions(r.data);
      });
      apiFetch<InstallData>(`/domains/${id}/installation-script`).then((r) => {
        if (r.data) setInstall(r.data);
      });
      setLoading(false);
    }
    init();
  }, [id]);

  async function verify(method: string) {
    setMessage('');
    setError('');
    const result = await apiFetch<{ verified: boolean; message: string }>(`/domains/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    });
    if (result.ok && result.data) {
      setMessage(result.data.message);
      if (result.data.verified) loadDomain();
    } else {
      setError(result.error?.message ?? 'Verification failed');
    }
  }

  async function runValidation() {
    const result = await apiFetch<ValidationResult>(`/domains/${id}/validate-installation`, {
      method: 'POST',
    });
    if (result.data) {
      setValidation(result.data);
      loadHistory();
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    const result = await apiFetch<Domain>(`/domains/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        enabled: settings.enabled,
        groupName: settings.groupName || undefined,
        scanLimit: settings.scanLimit,
        autoBlocking: settings.autoBlocking,
        debugMode: settings.debugMode,
      }),
    });
    if (result.ok) {
      setMessage('Domain settings saved');
      loadDomain();
    } else {
      setError(result.error?.message ?? 'Failed to save settings');
    }
  }

  function copySnippet() {
    if (install?.snippet) {
      navigator.clipboard.writeText(install.snippet);
      setMessage('Snippet copied to clipboard');
    }
  }

  return (
    <ProtectedLayout>
      {loading ? (
        <LoadingScreen message="Loading website…" inline />
      ) : !domain ? (
        <div className="card">
          <p className="error">{error || 'Website not found.'}</p>
          <Link href="/dashboard" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Back to dashboard
          </Link>
        </div>
      ) : (
        <>
      <p><Link href="/dashboard">← Back to dashboard</Link> · <Link href={`/websites/${id}/consent`}>Consent configuration</Link> · <Link href={`/websites/${id}/test-banner`}>Test banner</Link></p>
      <h1>{domain.hostname}</h1>
      <p style={{ color: 'var(--muted)' }}>
        Key: <code>{domain.domainKey}</code> · Verification: {domain.verificationStatus}
        {domain.isProduction && domain.environment === 'production' && domain.verificationStatus !== 'VERIFIED' && (
          <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
            Production config blocked until verified
          </span>
        )}
      </p>

      <div className="card website-setup-card" style={{ marginTop: '1.5rem' }}>
        <WebsiteSetupSteps
          domainId={domain.id}
          hostname={domain.hostname}
          verificationStatus={domain.verificationStatus}
          sdkLastSeenAt={domain.sdkLastSeenAt}
        />
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ marginTop: '1.5rem', maxWidth: 640 }}>
        <h3>Domain settings</h3>
        <form onSubmit={saveSettings}>
          <div className="field">
            <label htmlFor="enabled">Status</label>
            <select
              id="enabled"
              value={settings.enabled ? 'true' : 'false'}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.value === 'true' })}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="groupName">Domain group</label>
            <input
              id="groupName"
              value={settings.groupName}
              onChange={(e) => setSettings({ ...settings, groupName: e.target.value })}
              placeholder="e.g. Marketing sites"
            />
          </div>
          <div className="field">
            <label htmlFor="scanLimit">Scan limit</label>
            <input
              id="scanLimit"
              type="number"
              min={1}
              max={1000}
              value={settings.scanLimit}
              onChange={(e) => setSettings({ ...settings, scanLimit: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="autoBlocking">Auto-blocking</label>
            <select
              id="autoBlocking"
              value={settings.autoBlocking ? 'true' : 'false'}
              onChange={(e) => setSettings({ ...settings, autoBlocking: e.target.value === 'true' })}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <button className="btn btn-secondary" type="submit">Save settings</button>
        </form>
      </div>

      <div className="grid-2" style={{ marginTop: '1.5rem' }}>
        <div className="card" id="setup-verify">
          <h3>Domain verification</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Status: <strong>{domain?.verificationStatus}</strong>
            {domain?.verificationStatus === 'VERIFIED'
              ? ' — verified automatically. No DNS, meta tags, or verification files are required on your website.'
              : ' — will verify automatically when the CMP script loads on your site.'}
          </p>
          {domain?.verificationStatus !== 'VERIFIED' && instructions && (
            <>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                <p><strong>Optional manual checks</strong> (only if auto-verify is disabled):</p>
                <p><strong>DNS:</strong> {(instructions.dns_txt as { instructions: string })?.instructions}</p>
                <p><strong>Meta:</strong> {(instructions.meta_tag as { instructions: string })?.instructions}</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['DNS_TXT', 'HTML_FILE', 'META_TAG', 'CMP_SCRIPT', 'MANUAL'].map((m) => (
                  <button key={m} className="btn btn-secondary" type="button" onClick={() => verify(m)}>
                    Verify via {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card" id="setup-install">
          <h3>Installation script</h3>
          {install && (
            <>
              <pre style={{ background: 'var(--surface-muted)', padding: '1rem', borderRadius: 8, overflow: 'auto', fontSize: '0.75rem' }}>
                {install.snippet}
              </pre>
              <button className="btn" style={{ marginTop: '1rem' }} type="button" onClick={copySnippet}>
                Copy script
              </button>
              <div className="field" style={{ marginTop: '1rem' }}>
                <label htmlFor="guide">Platform guide</label>
                <select id="guide" value={guide} onChange={(e) => setGuide(e.target.value)}>
                  {Object.keys(install.guides).map((k) => (
                    <option key={k} value={k}>{k.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{install.guides[guide]}</p>
            </>
          )}
        </div>
      </div>

      <div className="card" id="setup-validate" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Installation validation</h3>
          <button className="btn btn-secondary" type="button" onClick={runValidation}>
            Run validation
          </button>
        </div>
        {validation && (
          <>
            <p style={{ marginTop: '1rem' }}>
              Overall: <strong>{validation.overallStatus}</strong>
            </p>
            <table style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {validation.checks.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td>{c.status}</td>
                    <td>{c.message}{c.remediation ? ` — ${c.remediation}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Validation history</h3>
          <table style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Checks</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.overallStatus}</td>
                  <td>{Array.isArray(item.checks) ? item.checks.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}
    </ProtectedLayout>
  );
}
