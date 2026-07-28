'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch, getApiUrl } from '@/lib/api';

interface AuditItem {
  id: string;
  action: string;
  module: string;
  userId: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [filters, setFilters] = useState({ module: '', action: '' });

  function load(query = '') {
    const params = new URLSearchParams();
    if (filters.module) params.set('module', filters.module);
    if (filters.action) params.set('action', filters.action);
    const qs = params.toString();
    apiFetch<{ items: AuditItem[] }>(`/audit-logs${qs ? `?${qs}` : ''}`).then((r) => {
      if (r.data) setItems(r.data.items);
    });
  }

  useEffect(() => {
    load();
  }, []);

  function onFilter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    load();
  }

  async function onExport() {
    const tokenRes = await fetch('/api/auth/access-token', { credentials: 'include' });
    const tokenJson = (await tokenRes.json()) as { accessToken?: string };
    const params = new URLSearchParams();
    if (filters.module) params.set('module', filters.module);
    if (filters.action) params.set('action', filters.action);
    const url = `${getApiUrl()}/audit-logs/export?${params.toString()}`;
    fetch(url, {
      headers: tokenJson.accessToken ? { Authorization: `Bearer ${tokenJson.accessToken}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      });
  }

  return (
    <ProtectedLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Audit logs</h1>
        <button className="btn btn-secondary" onClick={onExport} type="button">
          Export CSV
        </button>
      </div>

      <form className="card" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }} onSubmit={onFilter}>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
          <label htmlFor="module">Module</label>
          <input
            id="module"
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
            placeholder="organization"
          />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
          <label htmlFor="action">Action</label>
          <input
            id="action"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="organization.created"
          />
        </div>
        <button className="btn" type="submit" style={{ alignSelf: 'flex-end' }}>
          Filter
        </button>
      </form>

      <div className="card" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Module</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: 'var(--muted)' }}>No audit events yet</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>
                    {item.user
                      ? `${item.user.firstName} ${item.user.lastName}`
                      : item.userId ?? '—'}
                  </td>
                  <td>{item.module}</td>
                  <td>{item.action}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ProtectedLayout>
  );
}
