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
        isProduction: form.get('isProduction') === 'true',
        environment: form.get('environment'),
        groupName: form.get('groupName') || undefined,
        scanLimit: Number(form.get('scanLimit') || 10),
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
          <div className="field">
            <label htmlFor="hostname">Hostname</label>
            <input id="hostname" name="hostname" placeholder="example.com" required />
          </div>
          <div className="field">
            <label htmlFor="domainType">Type</label>
            <select id="domainType" name="domainType" defaultValue="ROOT">
              <option value="ROOT">Root domain</option>
              <option value="SUBDOMAIN">Subdomain</option>
              <option value="STAGING">Staging</option>
              <option value="ALIAS">Alias</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="groupName">Domain group</label>
            <input id="groupName" name="groupName" placeholder="Optional group name" />
          </div>
          <div className="field">
            <label htmlFor="scanLimit">Scan limit</label>
            <input id="scanLimit" name="scanLimit" type="number" min={1} max={1000} defaultValue={10} />
          </div>
          <div className="field">
            <label htmlFor="environment">Environment</label>
            <select id="environment" name="environment" defaultValue="production">
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="isProduction">Production domain</label>
            <select id="isProduction" name="isProduction" defaultValue="true">
              <option value="true">Yes</option>
              <option value="false">No</option>
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
