'use client';

import { useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  domainId: string | null;
  domainHostname: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);

  function load() {
    apiFetch<Notification[]>('/insights/notifications').then((r) => {
      if (r.data) setItems(r.data);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    await apiFetch(`/insights/notifications/${id}/read`, { method: 'POST' });
    load();
  }

  async function markAllRead() {
    await apiFetch('/insights/notifications/read-all', { method: 'POST' });
    load();
  }

  return (
    <ProtectedLayout>
      <h1>Notifications</h1>
      <p style={{ color: 'var(--muted)' }}>
        Compliance alerts for scans, installation, and policy changes.
      </p>

      <button className="btn btn-secondary" type="button" onClick={markAllRead} style={{ marginTop: '1rem' }}>
        Mark all read
      </button>

      <div className="card" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Severity</th>
              <th>Title</th>
              <th>Domain</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>No notifications</td></tr>
            ) : (
              items.map((n) => (
                <tr key={n.id} style={{ opacity: n.readAt ? 0.65 : 1 }}>
                  <td>{new Date(n.createdAt).toLocaleString()}</td>
                  <td>{n.severity}</td>
                  <td>
                    <strong>{n.title}</strong>
                    <br />
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{n.message}</span>
                  </td>
                  <td>{n.domainHostname ?? '—'}</td>
                  <td>
                    {!n.readAt && (
                      <button className="btn btn-secondary" type="button" onClick={() => markRead(n.id)}>
                        Mark read
                      </button>
                    )}
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
