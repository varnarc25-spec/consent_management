'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { apiFetch, getApiUrl } from '@/lib/api';

interface SdkHeartbeat {
  googleConsentModeDetected?: boolean;
  googleConsentModeEnabled?: boolean;
  googleConsentModeDefaultApplied?: boolean;
  googleConsentModeUpdateApplied?: boolean;
  googleConsentModeMode?: string;
}

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
  sdkLastSeenAt: string | null;
  sdkLastHeartbeat: SdkHeartbeat | null;
}

interface ScanSummary {
  id: string;
  status: string;
  pagesScanned: number;
  maxPages: number;
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

interface ValidationCheck {
  id: string;
  label: string;
  status: string;
  message: string;
  remediation?: string;
}

interface ValidationResult {
  overallStatus: string;
  checks: ValidationCheck[];
}

interface HistoryItem {
  id: string;
  overallStatus: string;
  createdAt: string;
  checks: ValidationCheck[];
}

interface DomainListItem {
  id: string;
  hostname: string;
  domainType: string;
  groupName: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  strictly_necessary: 'Necessary',
  preferences: 'Preferences',
  functional: 'Functional',
  analytics: 'Statistics',
  performance: 'Performance',
  marketing: 'Marketing',
  social_media: 'Social Media',
  unclassified: 'Unclassified',
};

const CATEGORY_ORDER = [
  'strictly_necessary',
  'preferences',
  'functional',
  'analytics',
  'performance',
  'marketing',
  'social_media',
  'unclassified',
];

function formatScanDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function settingsFromDomain(d: Domain) {
  return {
    enabled: d.enabled,
    region: d.region ?? '',
    groupName: d.groupName ?? '',
    scanLimit: d.scanLimit,
    scanFrequency: d.scanFrequency,
    autoBlocking: d.autoBlocking,
    debugMode: d.debugMode,
  };
}

export default function DomainDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [savedSettings, setSavedSettings] = useState<ReturnType<typeof settingsFromDomain> | null>(null);
  const [instructions, setInstructions] = useState<Record<string, unknown> | null>(null);
  const [install, setInstall] = useState<InstallData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [guide, setGuide] = useState('html');
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const scansRef = useRef<ScanSummary[]>([]);
  const [cookieSummary, setCookieSummary] = useState<CookieCategorySummary | null>(null);
  const [startingScan, setStartingScan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gcmCheck, setGcmCheck] = useState<ValidationCheck | null>(null);
  const [gcmLoading, setGcmLoading] = useState(false);
  const [allDomains, setAllDomains] = useState<DomainListItem[]>([]);
  const [aliasHostname, setAliasHostname] = useState('');
  const [addingAlias, setAddingAlias] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [consentLogDate, setConsentLogDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [settings, setSettings] = useState({
    enabled: true,
    region: '',
    groupName: '',
    scanLimit: 10,
    scanFrequency: 'MANUAL',
    autoBlocking: true,
    debugMode: false,
  });

  const isDirty = savedSettings !== null && JSON.stringify(settings) !== JSON.stringify(savedSettings);

  function loadDomain() {
    apiFetch<Domain>(`/domains/${id}`).then((r) => {
      if (r.data) {
        setDomain(r.data);
        const s = settingsFromDomain(r.data);
        setSettings(s);
        setSavedSettings(s);
      }
    });
  }

  function loadScans(silent = false) {
    return apiFetch<ScanSummary[]>(`/domains/${id}/scans`, { silent }).then((r) => {
      if (r.data) {
        setScans(r.data);
        scansRef.current = r.data;
      }
    });
  }

  function loadCookieSummary(silent = false) {
    return apiFetch<CookieCategorySummary>(`/domains/${id}/cookies/summary`, { silent }).then((r) => {
      if (r.data) setCookieSummary(r.data);
    });
  }

  function loadHistory() {
    apiFetch<HistoryItem[]>(`/domains/${id}/validation-history`).then((r) => {
      if (r.data) setHistory(r.data);
    });
  }

  function loadAllDomains() {
    apiFetch<DomainListItem[]>('/domains').then((r) => {
      if (r.data) setAllDomains(r.data);
    });
  }

  useEffect(() => {
    loadDomain();
    loadScans();
    loadCookieSummary();
    loadHistory();
    loadAllDomains();
    apiFetch<Record<string, unknown>>(`/domains/${id}/verification-instructions`).then((r) => {
      if (r.data) setInstructions(r.data);
    });
    apiFetch<InstallData>(`/domains/${id}/installation-script`).then((r) => {
      if (r.data) setInstall(r.data);
    });
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (scansRef.current.some((s) => s.status === 'RUNNING')) {
        loadScans(true);
        loadCookieSummary(true);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [id]);

  const lastCompletedScan = useMemo(
    () => scans.find((s) => s.status === 'COMPLETED'),
    [scans],
  );

  const sortedCategories = useMemo(() => {
    if (!cookieSummary) return [];
    const bySlug = new Map(cookieSummary.categories.map((c) => [c.slug, c]));
    const ordered = CATEGORY_ORDER
      .filter((slug) => bySlug.has(slug))
      .map((slug) => ({
        slug,
        label: CATEGORY_LABELS[slug] ?? bySlug.get(slug)!.name,
        count: bySlug.get(slug)!.count,
      }));
    for (const c of cookieSummary.categories) {
      if (!CATEGORY_ORDER.includes(c.slug)) {
        ordered.push({
          slug: c.slug,
          label: CATEGORY_LABELS[c.slug] ?? c.name,
          count: c.count,
        });
      }
    }
    return ordered;
  }, [cookieSummary]);

  const domainAliases = useMemo(() => {
    if (!domain) return [];
    return allDomains.filter(
      (d) =>
        d.id !== domain.id &&
        (d.groupName === domain.hostname ||
          d.domainType === 'STAGING' ||
          d.domainType === 'ALIAS'),
    );
  }, [allDomains, domain]);

  async function saveSettings() {
    setSaving(true);
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
    setSaving(false);
    if (result.ok && result.data) {
      setMessage('Changes saved');
      const s = settingsFromDomain(result.data);
      setSettings(s);
      setSavedSettings(s);
      setDomain(result.data);
    } else {
      setError(result.error?.message ?? 'Failed to save changes');
    }
  }

  function discardChanges() {
    if (savedSettings) {
      setSettings(savedSettings);
      setMessage('Changes discarded');
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
        maxPages: domain.scanLimit,
        maxDepth: 3,
        timeoutMs: 30000,
        jsRendering: true,
        deviceType: 'desktop',
      }),
    });
    setStartingScan(false);
    if (result.ok) {
      setMessage('Domain scan started');
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

  async function runGcmCheck() {
    setGcmLoading(true);
    setMessage('');
    const result = await apiFetch<ValidationResult>(`/domains/${id}/validate-installation`, {
      method: 'POST',
    });
    setGcmLoading(false);
    if (result.data) {
      const check = result.data.checks.find((c) => c.id === 'google_consent_mode');
      setGcmCheck(check ?? null);
      setValidation(result.data);
      loadDomain();
      loadHistory();
    } else {
      setError(result.error?.message ?? 'GCM check failed');
    }
  }

  async function downloadConsentLog() {
    const tokenRes = await fetch('/api/auth/access-token', { credentials: 'include' });
    const tokenJson = (await tokenRes.json()) as { accessToken?: string };
    const from = `${consentLogDate}T00:00:00.000Z`;
    const to = `${consentLogDate}T23:59:59.999Z`;
    const url = `${getApiUrl()}/consent-records/export?domainId=${id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=csv`;
    const res = await fetch(url, {
      headers: tokenJson.accessToken ? { Authorization: `Bearer ${tokenJson.accessToken}` } : {},
    });
    if (!res.ok) {
      setError('Failed to download consent log');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `consent-log-${domain?.hostname ?? 'domain'}-${consentLogDate}.csv`;
    a.click();
  }

  async function addAlias(e: FormEvent) {
    e.preventDefault();
    if (!aliasHostname.trim() || !domain) return;
    setAddingAlias(true);
    setError('');
    const result = await apiFetch<Domain>('/domains', {
      method: 'POST',
      body: JSON.stringify({
        hostname: aliasHostname.trim(),
        domainType: 'STAGING',
        groupName: domain.hostname,
        isProduction: false,
      }),
    });
    setAddingAlias(false);
    if (result.ok) {
      setAliasHostname('');
      setMessage('Domain alias added');
      loadAllDomains();
    } else {
      setError(result.error?.message ?? 'Failed to add alias');
    }
  }

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

  const gcmDisplay = gcmCheck ?? (domain.sdkLastHeartbeat
    ? {
        id: 'google_consent_mode',
        label: 'Google Consent Mode',
        status: domain.sdkLastHeartbeat.googleConsentModeEnabled === false
          ? 'PASS'
          : domain.sdkLastHeartbeat.googleConsentModeDefaultApplied
            ? domain.sdkLastHeartbeat.googleConsentModeUpdateApplied
              ? 'PASS'
              : 'WARNING'
            : 'FAIL',
        message: domain.sdkLastHeartbeat.googleConsentModeEnabled === false
          ? 'Google Consent Mode is disabled in policy'
          : domain.sdkLastHeartbeat.googleConsentModeDefaultApplied
            ? domain.sdkLastHeartbeat.googleConsentModeUpdateApplied
              ? `Consent Mode v2 active (${domain.sdkLastHeartbeat.googleConsentModeMode ?? 'advanced'})`
              : `Consent Mode v2 default applied; awaiting visitor update`
            : 'Load CMP script before GTM/gtag for Consent Mode',
      }
    : null);

  return (
    <ProtectedLayout>
      <nav className="domain-breadcrumb" aria-label="Breadcrumb">
        <Link href="/domains">Domains</Link>
        {' › '}
        <span>{domain.hostname}</span>
      </nav>

      <div className="domain-detail-header">
        <h1>{domain.hostname}</h1>
        <div className="domain-detail-actions">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!isDirty || saving}
            onClick={discardChanges}
          >
            Discard changes
          </button>
          <button className="btn" type="button" disabled={!isDirty || saving} onClick={saveSettings}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        <Link href={`/domains/${id}/consent`}>Consent</Link>
        {' · '}
        <Link href={`/domains/${id}/cookies`}>Cookies</Link>
        {' · '}
        <Link href={`/domains/${id}/scans`}>Scans</Link>
        {' · '}
        <Link href={`/domains/${id}/blocking`}>Blocking</Link>
        {' · '}
        <Link href={`/domains/${id}/test-banner`}>Test banner</Link>
      </p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="domain-section">
        <h2 className="domain-section-title">Overview</h2>
        <div className="domain-overview-grid">
          <div className="domain-panel">
            <h3>Status</h3>
            <div className="domain-stat-row">
              <span className="domain-stat-label">Last scan</span>
              <span className="domain-stat-value">
                {lastCompletedScan?.completedAt
                  ? formatScanDate(lastCompletedScan.completedAt)
                  : scans.some((s) => s.status === 'RUNNING')
                    ? 'Running…'
                    : '—'}
              </span>
            </div>
            <div className="domain-stat-row">
              <span className="domain-stat-label">Next scan</span>
              <span className="domain-stat-value">
                {domain.nextScanAt && domain.scanFrequency !== 'MANUAL'
                  ? formatScanDate(domain.nextScanAt)
                  : 'Not scheduled'}
              </span>
            </div>
            {lastCompletedScan && (
              <div className="domain-stat-row">
                <span className="domain-stat-label">Scanned subpages</span>
                <span className="domain-stat-value">
                  {lastCompletedScan.pagesScanned} subpages{' '}
                  <button
                    className="btn-link"
                    type="button"
                    onClick={() => downloadPagesCsv(lastCompletedScan.id)}
                  >
                    Download CSV
                  </button>
                </span>
              </div>
            )}
          </div>

          <div className="domain-panel">
            <h3>Cookies and Trackers</h3>
            <p className="domain-cookie-total">{cookieSummary?.total ?? 0}</p>
            <ul className="domain-category-list">
              {sortedCategories.map((c) => (
                <li key={c.slug}>
                  <span>{c.label}</span>
                  <span>{c.count}</span>
                </li>
              ))}
            </ul>
            <Link className="domain-panel-link" href={`/domains/${id}/cookies`}>
              Manage cookies and trackers →
            </Link>
          </div>
        </div>
      </section>

      <section className="domain-section">
        <h2 className="domain-section-title">Scan settings</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Choose how often {domain.hostname} should be scanned automatically. Scans run in the
          background and update your cookie inventory.
        </p>
        <div className="domain-scan-grid">
          <div className="domain-panel">
            <div className="field" style={{ marginBottom: 0 }}>
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
          </div>
          <div className="domain-panel domain-scan-now-card">
            <p>Scan your domain now</p>
            <button
              className="btn"
              type="button"
              disabled={startingScan}
              onClick={startScanNow}
            >
              {startingScan ? 'Starting…' : 'Start domain scan'}
            </button>
          </div>
        </div>
      </section>

      <section className="domain-section">
        <h2 className="domain-section-title">Alias for testing</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Create an alias within {domain.hostname} to test your consent setup before going live.
        </p>
        {domainAliases.length > 0 && (
          <ul style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            {domainAliases.map((a) => (
              <li key={a.id}>
                <Link href={`/domains/${a.id}`}>{a.hostname}</Link>
                <span style={{ color: 'var(--muted)' }}> ({a.domainType})</span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addAlias} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="staging.varnarc.com"
            value={aliasHostname}
            onChange={(e) => setAliasHostname(e.target.value)}
            style={{ flex: '1', minWidth: '200px', padding: '0.625rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}
          />
          <button className="btn btn-secondary" type="submit" disabled={addingAlias}>
            {addingAlias ? 'Adding…' : '+ Add Domain Alias'}
          </button>
        </form>
      </section>

      <section className="domain-section">
        <h2 className="domain-section-title">Google Consent Mode Check</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Check the implementation of Google Consent Mode (GCM) on your website.
        </p>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={gcmLoading}
          onClick={runGcmCheck}
        >
          {gcmLoading ? 'Checking…' : 'Start GCM check'}
        </button>
        {gcmDisplay ? (
          <div className="domain-panel" style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.875rem' }}>
              <strong>{gcmDisplay.status}</strong> — {gcmDisplay.message}
            </p>
          </div>
        ) : (
          <div className="domain-empty-state" style={{ marginTop: '1rem' }}>
            No data available. Start GCM check to verify your implementation.
          </div>
        )}
      </section>

      <section className="domain-section">
        <h2 className="domain-section-title">User Consent Logging</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          CMP records user consents in detailed consent logs, including anonymized IP addresses and
          timestamps.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label htmlFor="consentLogDate" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            Download User Consent Log
          </label>
          <input
            id="consentLogDate"
            type="date"
            value={consentLogDate}
            onChange={(e) => setConsentLogDate(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}
          />
          <button className="btn btn-secondary" type="button" onClick={downloadConsentLog}>
            Download User Consent Log
          </button>
        </div>
      </section>

      <button
        className="btn btn-secondary domain-advanced-toggle"
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
      </button>

      {showAdvanced && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem', maxWidth: 640 }}>
            <h3>Domain settings</h3>
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
                onChange={(e) =>
                  setSettings({ ...settings, autoBlocking: e.target.value === 'true' })
                }
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <h3>Domain verification</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                Status: <strong>{domain.verificationStatus}</strong>
              </p>
              {domain.verificationStatus !== 'VERIFIED' && instructions && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  {['DNS_TXT', 'HTML_FILE', 'META_TAG', 'CMP_SCRIPT', 'MANUAL'].map((m) => (
                    <button key={m} className="btn btn-secondary" type="button" onClick={() => verify(m)}>
                      Verify via {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h3>Installation script</h3>
              {install && (
                <>
                  <pre style={{ fontSize: '0.75rem', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
                    {install.snippet}
                  </pre>
                  <button className="btn" style={{ marginTop: '0.75rem' }} type="button" onClick={copySnippet}>
                    Copy script
                  </button>
                </>
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div className="card">
              <h3>Validation history</h3>
              <table style={{ marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                      <td>{item.overallStatus}</td>
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
