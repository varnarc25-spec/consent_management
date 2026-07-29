'use client';

import { useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch, clearStoredTokens } from '@/lib/api';

interface LoginRecord {
  id: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch<LoginRecord[]>('/auth/login-history').then((r) => {
      if (r.data) setHistory(r.data);
    });
  }, []);

  async function logoutAll() {
    const result = await apiFetch('/auth/logout-all', { method: 'POST' });
    if (result.ok) {
      setMessage('Logged out from all devices');
      clearStoredTokens();
      window.location.assign('/auth/logout');
    }
  }

  return (
    <ProtectedLayout>
      <h1>Settings</h1>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Security</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Revoke all active sessions across every device.
        </p>
        <button className="btn btn-secondary" onClick={logoutAll} type="button" style={{ marginTop: '1rem' }}>
          Logout from all devices
        </button>
        {message && <p className="success" style={{ marginTop: '1rem' }}>{message}</p>}
      </div>

      <div className="card" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
        <h3>Login activity</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Status</th>
              <th>IP</th>
              <th>User agent</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record) => (
              <tr key={record.id}>
                <td>{new Date(record.createdAt).toLocaleString()}</td>
                <td>{record.success ? 'Success' : 'Failed'}</td>
                <td>{record.ipAddress ?? '—'}</td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {record.userAgent ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedLayout>
  );
}
