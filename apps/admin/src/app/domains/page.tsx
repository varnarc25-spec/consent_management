'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
  domainType: string;
  verificationStatus: string;
  enabled: boolean;
  isProduction: boolean;
  groupName: string | null;
  scanLimit: number;
}

export default function DomainsPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  function load() {
    apiFetch<Domain[]>('/domains').then((r) => {
      if (r.data) setDomains(r.data);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await apiFetch<Domain>('/domains', {
      method: 'POST',
      body: JSON.stringify({
        hostname: form.get('hostname'),
        domainType: form.get('domainType'),
      }),
    });
    if (result.ok) {
      setShowForm(false);
      load();
      if (result.data) router.push(`/domains/${result.data.id}`);
    } else {
      setError(result.error?.message ?? 'Failed to add domain');
    }
  }

  return (
    <ProtectedLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Domains</h1>
        <button className="btn" type="button" onClick={() => setShowForm(!showForm)}>
          Add domain
        </button>
      </div>

      {showForm && (
        <form className="card" style={{ marginTop: '1rem', maxWidth: 520 }} onSubmit={onCreate}>
          <h3>Add website domain</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: 0 }}>
            Fields marked <strong>*</strong> are required. All other settings use sensible defaults.
          </p>
          <div className="field">
            <label htmlFor="hostname">Hostname <span className="required">*</span></label>
            <input id="hostname" name="hostname" placeholder="example.com" required />
          </div>
          <div className="field">
            <label htmlFor="domainType">Domain type <span className="required">*</span></label>
            <select id="domainType" name="domainType" defaultValue="ROOT" required>
              <option value="ROOT">Root domain</option>
              <option value="SUBDOMAIN">Subdomain</option>
              <option value="STAGING">Staging</option>
              <option value="ALIAS">Alias</option>
            </select>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit">Add domain</button>
        </form>
      )}

      <div className="card" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Hostname</th>
              <th>Type</th>
              <th>Group</th>
              <th>Verification</th>
              <th>Domain key</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: 'var(--muted)' }}>No domains yet</td>
              </tr>
            ) : (
              domains.map((d) => (
                <tr key={d.id}>
                  <td>{d.hostname}</td>
                  <td>{d.domainType}</td>
                  <td>{d.groupName ?? '—'}</td>
                  <td>{d.verificationStatus}</td>
                  <td><code style={{ fontSize: '0.75rem' }}>{d.domainKey}</code></td>
                  <td>{d.enabled ? 'Enabled' : 'Disabled'}</td>
                  <td>
                    <Link href={`/domains/${d.id}`}>Manage</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ProtectedLayout>
  );
}
