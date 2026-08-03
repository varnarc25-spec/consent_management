'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

type Tab = 'wordpress' | 'gtm' | 'manual';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
  sdkLastHeartbeat: { integrationSource?: string } | null;
}

interface InstallData {
  snippet: string;
  guides: Record<string, string>;
}

interface ValidationResult {
  overallStatus: string;
  checks: Array<{ id: string; label: string; status: string; message: string }>;
}

export default function DomainInstallPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [tab, setTab] = useState<Tab>('wordpress');
  const [domain, setDomain] = useState<Domain | null>(null);
  const [install, setInstall] = useState<InstallData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch<Domain>(`/domains/${domainId}`).then((r) => {
      if (r.data) setDomain(r.data);
    });
    apiFetch<InstallData>(`/domains/${domainId}/installation-script`).then((r) => {
      if (r.data) setInstall(r.data);
    });
  }, [domainId]);

  async function runValidation() {
    const result = await apiFetch<ValidationResult>(`/domains/${domainId}/validate-installation`, {
      method: 'POST',
    });
    if (result.data) {
      setValidation(result.data);
      setMessage(`Validation: ${result.data.overallStatus}`);
    }
  }

  function copySnippet() {
    if (install?.snippet) {
      navigator.clipboard.writeText(install.snippet);
      setMessage('Snippet copied');
    }
  }

  const integration = domain?.sdkLastHeartbeat?.integrationSource;

  return (
    <ProtectedLayout>
      <p>
        <Link href={`/domains/${domainId}`}>← Back to domain</Link>
      </p>
      <h1>Installation wizard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Install the CMP on <strong>{domain?.hostname ?? '…'}</strong>
        {integration && (
          <span style={{ marginLeft: '0.5rem' }}>
            · Detected integration: <code>{integration}</code>
          </span>
        )}
      </p>

      {message && <p className="success">{message}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {(['wordpress', 'gtm', 'manual'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'btn' : 'btn btn-secondary'}
            onClick={() => setTab(key)}
          >
            {key === 'wordpress' ? 'WordPress' : key === 'gtm' ? 'Google Tag Manager' : 'Manual HTML'}
          </button>
        ))}
      </div>

      {tab === 'wordpress' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>WordPress plugin</h3>
          <ol style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
            <li>
              Download or copy the plugin from{' '}
              <code>integrations/wordpress/cmp-consent-management</code> in the CMP repository.
            </li>
            <li>Upload to <code>wp-content/plugins/</code> and activate <strong>CMP Consent Management</strong>.</li>
            <li>
              Create an API key on the <Link href="/developers">Developers</Link> page with{' '}
              <code>domains:read</code> and <code>scans:write</code> scopes.
            </li>
            <li>
              In WordPress go to <strong>Settings → CMP Consent</strong>, enter API URL and key, click{' '}
              <strong>Load domains</strong>, select this site, and save.
            </li>
            <li>
              Optional shortcodes: <code>[cmp_cookie_declaration]</code>,{' '}
              <code>[cmp_privacy_trigger]</code>
            </li>
            <li>Visit your site, then run validation below or use the plugin&apos;s validate button.</li>
          </ol>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            The plugin injects <code>data-integration=&quot;wordpress&quot;</code> for dashboard diagnostics.
            Auto-blocking and Google Consent Mode follow your published consent policy.
          </p>
        </div>
      )}

      {tab === 'gtm' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Google Tag Manager</h3>
          <ol style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
            <li>
              Add the CMP script <strong>before</strong> the GTM container snippet in <code>&lt;head&gt;</code>.
            </li>
            <li>
              Import the community template from{' '}
              <code>project/docs/gtm/community-template.tpl</code> (CMP Consent Mode v2 tag).
            </li>
            <li>
              Enable Google Consent Mode in <Link href={`/domains/${domainId}/consent`}>Consent configuration</Link>{' '}
              and publish the policy.
            </li>
            <li>
              In GTM Preview, open the <strong>Consent</strong> tab and confirm denied defaults before banner
              interaction; interact with the banner and verify <code>cmp_consent_update</code> in the data layer.
            </li>
            <li>
              Add <code>data-integration=&quot;gtm&quot;</code> on the CMP script tag if installed via Custom HTML tag.
            </li>
          </ol>
          {install && (
            <>
              <pre style={{ background: 'var(--surface-muted)', padding: '1rem', borderRadius: 8, fontSize: '0.75rem', overflow: 'auto' }}>
                {install.snippet.replace('async', 'data-integration="gtm" async')}
              </pre>
              <button className="btn btn-secondary" type="button" onClick={copySnippet}>Copy CMP snippet</button>
            </>
          )}
          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            Full guide: <code>project/docs/gtm/README.md</code>
          </p>
        </div>
      )}

      {tab === 'manual' && install && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Manual HTML</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{install.guides.html}</p>
          <pre style={{ background: 'var(--surface-muted)', padding: '1rem', borderRadius: 8, fontSize: '0.75rem', overflow: 'auto' }}>
            {install.snippet}
          </pre>
          <button className="btn" type="button" onClick={copySnippet}>Copy script</button>
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Validate installation</h3>
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
                    <td>{c.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
