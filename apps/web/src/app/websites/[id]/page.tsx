'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { WebsiteSetupSteps } from '@/components/website-setup-steps';
import { WebsiteLayout } from '@/components/website-layout';
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
  scanFrequency: string;
  nextScanAt: string | null;
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
    scanFrequency: 'MANUAL',
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
        scanFrequency: r.data.scanFrequency ?? 'MANUAL',
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
    apiFetch<HistoryItem[]>(`/domains/${id}/validation-history`, { silent: true }).then((r) => {
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
      apiFetch<Record<string, unknown>>(`/domains/${id}/verification-instructions`, {
        silent: true,
      }).then((r) => {
        if (r.data) setInstructions(r.data);
      });
      apiFetch<InstallData>(`/domains/${id}/installation-script`, { silent: true }).then((r) => {
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
        scanFrequency: settings.scanFrequency,
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
        <WebsiteLayout
          domainId={id}
          hostname={domain.hostname}
          overview={{
            domainId: domain.id,
            scanLimit: domain.scanLimit,
            scanFrequency: settings.scanFrequency,
            nextScanAt: domain.nextScanAt,
            onFrequencyChange: (f) => setSettings((s) => ({ ...s, scanFrequency: f })),
          }}
        >
      <h1>{domain.hostname}</h1>
      <p style={{ color: 'var(--muted)' }}>
        Key: <code>{domain.domainKey}</code> · Verification: {domain.verificationStatus}
        {domain.isProduction && domain.environment === 'production' && domain.verificationStatus !== 'VERIFIED' && (
          <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
            Production config blocked until verified
          </span>
        )}
      </p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card website-setup-card" style={{ marginTop: '0' }}>
        <WebsiteSetupSteps
          domainId={domain.id}
          hostname={domain.hostname}
          verificationStatus={domain.verificationStatus}
          sdkLastSeenAt={domain.sdkLastSeenAt}
        />
      </div>

      <div className="card website-domain-merged" style={{ marginTop: '1.5rem' }}>
        <div className="website-domain-split">
          <div className="website-domain-left">
            <section className="website-domain-section">
              <h3>Website settings</h3>
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
                  <label htmlFor="scanLimit">Scan page limit</label>
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
            </section>

            <section className="website-domain-section" id="setup-verify">
              <h3>Domain verification</h3>
              <p className="website-section-muted">
                Status: <strong>{domain.verificationStatus}</strong>
                {domain.verificationStatus === 'VERIFIED'
                  ? ' — verified automatically. No DNS, meta tags, or verification files are required on your website.'
                  : ' — will verify automatically when the CMP script loads on your site.'}
              </p>
              {domain.verificationStatus !== 'VERIFIED' && instructions && (
                <>
                  <div className="website-section-muted" style={{ marginBottom: '1rem' }}>
                    <p><strong>Optional manual checks</strong> (only if auto-verify is disabled):</p>
                    <p><strong>DNS:</strong> {(instructions.dns_txt as { instructions: string })?.instructions}</p>
                    <p><strong>Meta:</strong> {(instructions.meta_tag as { instructions: string })?.instructions}</p>
                  </div>
                  <div className="website-verify-actions">
                    {['DNS_TXT', 'HTML_FILE', 'META_TAG', 'CMP_SCRIPT', 'MANUAL'].map((m) => (
                      <button key={m} className="btn btn-secondary" type="button" onClick={() => verify(m)}>
                        Verify via {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <div className="website-domain-right" id="setup-install">
            <section className="website-domain-section">
              <h3>Installation script</h3>
              {install && (
                <>
                  <pre className="website-install-snippet">{install.snippet}</pre>
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
                  <p className="website-section-muted">{install.guides[guide]}</p>
                </>
              )}
            </section>

            <section className="website-domain-section" id="setup-validate">
              <div className="website-install-validate-header">
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
            </section>

            {history.length > 0 && (
              <section className="website-domain-section">
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
              </section>
            )}
          </div>
        </div>
      </div>
        </WebsiteLayout>
      )}
    </ProtectedLayout>
  );
}
