'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { apiFetch, getApiUrl } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
  domainType: string;
  verificationStatus: string;
  verificationMethod: string | null;
  verificationToken: string;
  environment: string;
  region: string | null;
  autoBlocking: boolean;
  debugMode: boolean;
  enabled: boolean;
  groupName: string | null;
  scanLimit: number;
  scanFrequency: string;
  nextScanAt: string | null;
  isProduction: boolean;
}

interface ScanSummary {
  id: string;
  status: string;
  pagesScanned: number;
  cookiesFound: number;
  trackersFound: number;
  completedAt: string | null;
  createdAt: string;
}

interface CookieCategorySummary {
  total: number;
  categories: Array<{ slug: string; name: string; count: number }>;
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
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [cookieSummary, setCookieSummary] = useState<CookieCategorySummary | null>(null);
  const [startingScan, setStartingScan] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    region: '',
    groupName: '',
    scanLimit: 10,
    scanFrequency: 'MANUAL',
    autoBlocking: true,
    debugMode: false,
  });

  function loadDomain() {
    apiFetch<Domain>(`/domains/${id}`).then((r) => {
      if (r.data) {
        setDomain(r.data);
        setSettings({
          enabled: r.data.enabled,
          region: r.data.region ?? '',
          groupName: r.data.groupName ?? '',
          scanLimit: r.data.scanLimit,
          scanFrequency: r.data.scanFrequency,
          autoBlocking: r.data.autoBlocking,
          debugMode: r.data.debugMode,
        });
      }
    });
  }

  function loadHistory() {
    apiFetch<HistoryItem[]>(`/domains/${id}/validation-history`).then((r) => {
      if (r.data) setHistory(r.data);
    });
  }

  function loadScans() {
    apiFetch<ScanSummary[]>(`/domains/${id}/scans`).then((r) => {
      if (r.data) setScans(r.data);
    });
  }

  function loadCookieSummary() {
    apiFetch<CookieCategorySummary>(`/domains/${id}/cookies/summary`).then((r) => {
      if (r.data) setCookieSummary(r.data);
    });
  }

  useEffect(() => {
    loadDomain();
    loadScans();
    loadCookieSummary();
    loadHistory();
    apiFetch<Record<string, unknown>>(`/domains/${id}/verification-instructions`).then((r) => {
      if (r.data) setInstructions(r.data);
    });
    apiFetch<InstallData>(`/domains/${id}/installation-script`).then((r) => {
      if (r.data) setInstall(r.data);
    });
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
        region: settings.region || undefined,
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

  async function startScanNow() {
    if (!domain) return;
    setStartingScan(true);
    setMessage('');
    setError('');
    const result = await apiFetch<ScanSummary>(`/domains/${id}/scans`, {
      method: 'POST',
      body: JSON.stringify({
        startUrl: `https://${domain.hostname}/`,
        maxDepth: 2,
        timeoutMs: 30000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStartingScan(false);
    if (result.ok) {
      setMessage('Scan started');
      loadScans();
    } else {
      setError(result.error?.message ?? 'Failed to start scan');
    }
  }

  async function downloadPagesCsv(scanId: string) {
    const tokenRes = await fetch('/api/auth/access-token', { credentials: 'include' });
    const tokenJson = (await tokenRes.json()) as { accessToken?: string };
    const url = `${getApiUrl()}/domains/${id}/scans/${scanId}/export`;
    const res = await fetch(url, {
      headers: tokenJson.accessToken ? { Authorization: `Bearer ${tokenJson.accessToken}` } : {},
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${domain?.hostname ?? 'domain'}-scan-pages.csv`;
    a.click();
  }

  function copySnippet() {
    if (install?.snippet) {
      navigator.clipboard.writeText(install.snippet);
      setMessage('Snippet copied to clipboard');
    }
  }

  if (!domain) {
    return (
      <ProtectedLayout>
        <LoadingScreen message="Loading domain…" inline />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <p><Link href="/domains">← Back to domains</Link> · <Link href={`/domains/${id}/consent`}>Consent configuration</Link> · <Link href={`/domains/${id}/install`}>Installation wizard</Link> · <Link href={`/domains/${id}/ai`}>AI assistant</Link> · <Link href={`/domains/${id}/scans`}>Website scans</Link> · <Link href={`/domains/${id}/cookies`}>Cookie repository</Link> · <Link href={`/domains/${id}/blocking`}>Blocking</Link> · <Link href={`/domains/${id}/test-banner`}>Test banner</Link></p>
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

      <div className="grid-2" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <h3>Status</h3>
          <p style={{ fontSize: '0.875rem' }}>
            <strong>Last scan:</strong>{' '}
            {scans[0] ? `${scans[0].status} · ${new Date(scans[0].createdAt).toLocaleString()}` : 'No scans yet'}
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            <strong>Next scan:</strong>{' '}
            {domain.nextScanAt ? new Date(domain.nextScanAt).toLocaleString() : 'Not scheduled'}
          </p>
          {(() => {
            const lastCompleted = scans.find((s) => s.status === 'COMPLETED');
            if (!lastCompleted) return null;
            return (
              <p style={{ fontSize: '0.875rem' }}>
                <strong>Scanned subpages:</strong> {lastCompleted.pagesScanned}{' '}
                <button
                  className="btn-link"
                  type="button"
                  onClick={() => downloadPagesCsv(lastCompleted.id)}
                >
                  Download CSV
                </button>
              </p>
            );
          })()}
        </div>

        <div className="card">
          <h3>Cookies and Trackers</h3>
          <p style={{ fontSize: '0.875rem' }}><strong>Total:</strong> {cookieSummary?.total ?? 0}</p>
          {cookieSummary?.categories.map((c) => (
            <p key={c.slug} style={{ fontSize: '0.875rem', margin: '0.25rem 0' }}>
              {c.name}: {c.count}
            </p>
          ))}
          <Link href={`/domains/${id}/cookies`}>Manage cookies and trackers →</Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', maxWidth: 640 }}>
        <h3>Scan settings</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Choose how often {domain.hostname} should be scanned automatically, or start a scan now.
        </p>
        <form onSubmit={saveSettings}>
          <div className="field">
            <label htmlFor="scanFrequency">Scan frequency</label>
            <select
              id="scanFrequency"
              value={settings.scanFrequency}
              onChange={(e) => setSettings({ ...settings, scanFrequency: e.target.value })}
            >
              <option value="MANUAL">Manual</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <button className="btn btn-secondary" type="submit">Save frequency</button>
        </form>
        <button
          className="btn"
          style={{ marginTop: '1rem' }}
          type="button"
          disabled={startingScan}
          onClick={startScanNow}
        >
          {startingScan ? 'Starting…' : 'Start domain scan now'}
        </button>
      </div>

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
            <label htmlFor="region">Default region label</label>
            <input
              id="region"
              value={settings.region}
              onChange={(e) => setSettings({ ...settings, region: e.target.value })}
              placeholder="e.g. EU, US, GLOBAL"
            />
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Fallback when geo detection is unavailable. Not a substitute for regional rules.
            </p>
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
        <div className="card">
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

        <div className="card">
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

      <div className="card" style={{ marginTop: '1.5rem' }}>
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
    </ProtectedLayout>
  );
}
