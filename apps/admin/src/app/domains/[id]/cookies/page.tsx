'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

interface DomainCookie {
  id: string;
  cookieName: string;
  cookieDomain: string | null;
  provider: string | null;
  category: string | null;
  description: string | null;
  purpose: string | null;
  duration: string | null;
  isThirdParty: boolean | null;
  riskLevel: string | null;
  matchMethod: string | null;
  matchConfidence: number | null;
  reviewStatus: string;
  foundBeforeConsent: boolean;
  seenCount: number;
  lastSeenAt: string;
  inventoryType: string;
}

const INVENTORY_TYPE_LABELS: Record<string, string> = {
  COOKIE: 'Cookie',
  LOCAL_STORAGE: 'Local storage',
  SESSION_STORAGE: 'Session storage',
  INDEXED_DB: 'IndexedDB',
  SCRIPT: 'Script',
  IFRAME: 'Iframe',
  PIXEL: 'Pixel',
  NETWORK_REQUEST: 'Network',
  SERVICE_WORKER: 'Service worker',
};

const CATEGORIES = [
  'strictly_necessary',
  'functional',
  'analytics',
  'marketing',
  'social_media',
  'personalization',
];

export default function DomainCookiesPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [tab, setTab] = useState<'all' | 'review'>('all');
  const [cookies, setCookies] = useState<DomainCookie[]>([]);
  const [unknown, setUnknown] = useState<DomainCookie[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<DomainCookie | null>(null);
  const [form, setForm] = useState({
    provider: '',
    category: 'analytics',
    description: '',
    purpose: '',
    duration: '',
    reviewStatus: 'APPROVED' as 'APPROVED' | 'REJECTED',
  });

  function load() {
    apiFetch<DomainCookie[]>(`/domains/${domainId}/cookies`).then((r) => {
      if (r.data) setCookies(r.data);
    });
    apiFetch<DomainCookie[]>(`/domains/${domainId}/cookies/unknown`).then((r) => {
      if (r.data) setUnknown(r.data);
    });
  }

  useEffect(() => {
    load();
  }, [domainId]);

  function openReview(cookie: DomainCookie) {
    setEditing(cookie);
    setForm({
      provider: cookie.provider ?? '',
      category: cookie.category ?? 'analytics',
      description: cookie.description ?? '',
      purpose: cookie.purpose ?? '',
      duration: cookie.duration ?? '',
      reviewStatus: 'APPROVED',
    });
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setMessage('');
    const result = await apiFetch<DomainCookie>(
      `/domains/${domainId}/cookies/${editing.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(form),
      },
    );
    if (result.ok) {
      setMessage('Cookie classification saved');
      setEditing(null);
      load();
    } else {
      setError(result.error?.message ?? 'Failed to save classification');
    }
  }

  const list = tab === 'review' ? unknown : cookies;

  return (
    <ProtectedLayout>
      <p>
        <Link href={`/domains/${domainId}`}>← Back to domain</Link> ·{' '}
        <Link href={`/domains/${domainId}/ai`}>AI assistant</Link> ·{' '}
        <Link href={`/domains/${domainId}/scans`}>Website scans</Link>
      </p>
      <h1>Cookie repository</h1>
      <p style={{ color: 'var(--muted)' }}>
        Cookies, local storage keys, and trackers discovered by scans. Auto-matched items appear in the
        category breakdown on the domain overview.
      </p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <button
          type="button"
          className={tab === 'all' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('all')}
        >
          All items ({cookies.length})
        </button>
        <button
          type="button"
          className={tab === 'review' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('review')}
        >
          Review queue ({unknown.length})
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Domain</th>
              <th>Provider</th>
              <th>Category</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Before consent</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((cookie) => (
              <tr key={cookie.id}>
                <td>{INVENTORY_TYPE_LABELS[cookie.inventoryType] ?? cookie.inventoryType}</td>
                <td><code>{cookie.cookieName}</code></td>
                <td>{cookie.cookieDomain ?? '—'}</td>
                <td>{cookie.provider ?? '—'}</td>
                <td>{cookie.category ?? '—'}</td>
                <td><code>{cookie.reviewStatus}</code></td>
                <td>{cookie.matchConfidence ?? '—'}</td>
                <td>{cookie.foundBeforeConsent ? 'yes' : 'no'}</td>
                <td>
                  {(cookie.reviewStatus === 'PENDING' || cookie.reviewStatus === 'AUTO_MATCHED') && (
                    <button className="btn btn-secondary" type="button" onClick={() => openReview(cookie)}>
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p style={{ color: 'var(--muted)' }}>No cookies in this view yet. Run a scan first.</p>}
      </div>

      {editing && (
        <form className="card" onSubmit={submitReview} style={{ marginTop: '1rem' }}>
          <h3>Review <code>{editing.cookieName}</code></h3>
          <div className="field">
            <label htmlFor="provider">Provider</label>
            <input id="provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="purpose">Purpose</label>
            <input id="purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="duration">Duration</label>
            <input id="duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="reviewStatus">Decision</label>
            <select
              id="reviewStatus"
              value={form.reviewStatus}
              onChange={(e) => setForm({ ...form, reviewStatus: e.target.value as 'APPROVED' | 'REJECTED' })}
            >
              <option value="APPROVED">Approve classification</option>
              <option value="REJECTED">Reject / mark invalid</option>
            </select>
          </div>
          <button className="btn" type="submit">Save classification</button>
          <button className="btn btn-secondary" type="button" style={{ marginLeft: '0.5rem' }} onClick={() => setEditing(null)}>
            Cancel
          </button>
        </form>
      )}
    </ProtectedLayout>
  );
}
