'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

const API_KEY_SCOPES = [
  'domains:read',
  'domains:write',
  'consent:read',
  'scans:read',
  'scans:write',
  'cookies:read',
  'policies:read',
] as const;

const WEBHOOK_EVENT_TYPES = [
  'scan.started',
  'scan.completed',
  'scan.failed',
  'cookie.discovered',
  'cookie.changed',
  'tracker.violation_detected',
  'consent.created',
  'consent.updated',
  'consent.withdrawn',
  'policy.published',
  'domain.verification_failed',
  'installation.issue_detected',
] as const;

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface WebhookRow {
  id: string;
  url: string;
  secretPrefix: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  createdAt: string;
}

interface DeliveryRow {
  id: string;
  webhookEndpointId: string;
  eventType: string;
  status: string;
  attemptCount: number;
  responseStatus: number | null;
  errorMessage: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

type Tab = 'api-keys' | 'webhooks' | 'deliveries';

export default function DevelopersPage() {
  const [tab, setTab] = useState<Tab>('api-keys');
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const [keyName, setKeyName] = useState('');
  const [keyEnvironment, setKeyEnvironment] = useState<'PRODUCTION' | 'SANDBOX'>('PRODUCTION');
  const [keyScopes, setKeyScopes] = useState<string[]>(['domains:read', 'consent:read']);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['consent.created']);
  const [webhookDescription, setWebhookDescription] = useState('');

  function loadAll() {
    apiFetch<ApiKeyRow[]>('/api-keys').then((r) => {
      if (r.data) setApiKeys(r.data);
    });
    apiFetch<WebhookRow[]>('/webhooks').then((r) => {
      if (r.data) setWebhooks(r.data);
    });
    apiFetch<DeliveryRow[]>('/webhooks/deliveries').then((r) => {
      if (r.data) setDeliveries(r.data);
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createApiKey(e: FormEvent) {
    e.preventDefault();
    setError('');
    const result = await apiFetch<{ key: string; warning?: string } & ApiKeyRow>('/api-keys', {
      method: 'POST',
      body: JSON.stringify({
        name: keyName,
        environment: keyEnvironment,
        scopes: keyScopes,
      }),
    });
    if (result.ok && result.data) {
      setRevealedSecret(result.data.key);
      setMessage(result.data.warning ?? 'API key created');
      setKeyName('');
      loadAll();
    } else {
      setError(result.error?.message ?? 'Failed to create API key');
    }
  }

  async function revokeKey(id: string) {
    const result = await apiFetch(`/api-keys/${id}`, { method: 'DELETE' });
    if (result.ok) {
      setMessage('API key revoked');
      loadAll();
    } else {
      setError(result.error?.message ?? 'Failed to revoke API key');
    }
  }

  async function createWebhook(e: FormEvent) {
    e.preventDefault();
    setError('');
    const result = await apiFetch<{ secret: string; warning?: string } & WebhookRow>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        events: webhookEvents,
        description: webhookDescription || undefined,
      }),
    });
    if (result.ok && result.data) {
      setRevealedSecret(result.data.secret);
      setMessage(result.data.warning ?? 'Webhook endpoint created');
      setWebhookUrl('');
      setWebhookDescription('');
      loadAll();
    } else {
      setError(result.error?.message ?? 'Failed to create webhook');
    }
  }

  async function toggleWebhook(webhook: WebhookRow) {
    const result = await apiFetch(`/webhooks/${webhook.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !webhook.enabled }),
    });
    if (result.ok) loadAll();
  }

  async function deleteWebhook(id: string) {
    const result = await apiFetch(`/webhooks/${id}`, { method: 'DELETE' });
    if (result.ok) {
      setMessage('Webhook deleted');
      loadAll();
    }
  }

  async function retryDelivery(id: string) {
    const result = await apiFetch(`/webhooks/deliveries/${id}/retry`, { method: 'POST' });
    if (result.ok) {
      setMessage('Delivery retry queued');
      loadAll();
    } else {
      setError(result.error?.message ?? 'Retry failed');
    }
  }

  function toggleScope(scope: string) {
    setKeyScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope],
    );
  }

  function toggleWebhookEvent(event: string) {
    setWebhookEvents((current) =>
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    );
  }

  return (
    <ProtectedLayout>
      <h1>Developers</h1>
      <p style={{ color: 'var(--muted)' }}>
        Manage API keys, webhook endpoints, and review delivery history. Developer REST API base path:{' '}
        <code>/api/v1/developer/v1</code>
      </p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      {revealedSecret && (
        <div className="card" style={{ marginBottom: '1rem', background: '#fffbeb' }}>
          <strong>Copy now — shown once</strong>
          <pre style={{ marginTop: '0.5rem', overflow: 'auto' }}>{revealedSecret}</pre>
          <button className="btn btn-secondary" type="button" onClick={() => setRevealedSecret(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['api-keys', 'webhooks', 'deliveries'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? 'btn' : 'btn btn-secondary'}
            onClick={() => setTab(item)}
          >
            {item === 'api-keys' ? 'API keys' : item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'api-keys' && (
        <div className="grid-2">
          <form className="card" onSubmit={createApiKey}>
            <h3>Create API key</h3>
            <div className="field">
              <label htmlFor="keyName">Name</label>
              <input id="keyName" value={keyName} onChange={(e) => setKeyName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="keyEnvironment">Environment</label>
              <select
                id="keyEnvironment"
                value={keyEnvironment}
                onChange={(e) => setKeyEnvironment(e.target.value as 'PRODUCTION' | 'SANDBOX')}
              >
                <option value="PRODUCTION">Production</option>
                <option value="SANDBOX">Sandbox (sandbox domains only)</option>
              </select>
            </div>
            <div className="field">
              <label>Scopes</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {API_KEY_SCOPES.map((scope) => (
                  <label key={scope}>
                    <input
                      type="checkbox"
                      checked={keyScopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                    />
                    {scope}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn" type="submit">Create key</button>
          </form>

          <div className="card">
            <h3>Active API keys</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Environment</th>
                  <th>Scopes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td>{key.name}</td>
                    <td><code>{key.keyPrefix}…</code></td>
                    <td>{key.environment}</td>
                    <td>{key.scopes.join(', ')}</td>
                    <td>
                      <button className="btn btn-secondary" type="button" onClick={() => revokeKey(key.id)}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="grid-2">
          <form className="card" onSubmit={createWebhook}>
            <h3>Add webhook endpoint</h3>
            <div className="field">
              <label htmlFor="webhookUrl">URL</label>
              <input
                id="webhookUrl"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhooks/cmp"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="webhookDescription">Description</label>
              <input
                id="webhookDescription"
                value={webhookDescription}
                onChange={(e) => setWebhookDescription(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Events</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: 160, overflow: 'auto' }}>
                {WEBHOOK_EVENT_TYPES.map((event) => (
                  <label key={event}>
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(event)}
                      onChange={() => toggleWebhookEvent(event)}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn" type="submit">Create webhook</button>
          </form>

          <div className="card">
            <h3>Webhook endpoints</h3>
            {webhooks.map((webhook) => (
              <div key={webhook.id} style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 0' }}>
                <p><strong>{webhook.url}</strong></p>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                  Secret: <code>{webhook.secretPrefix}…</code> · {webhook.enabled ? 'Enabled' : 'Disabled'}
                </p>
                <p style={{ fontSize: '0.8125rem' }}>{webhook.events.join(', ')}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-secondary" type="button" onClick={() => toggleWebhook(webhook)}>
                    {webhook.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => deleteWebhook(webhook.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'deliveries' && (
        <div className="card">
          <h3>Delivery history</h3>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Response</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td><code>{delivery.eventType}</code></td>
                  <td>{delivery.status}</td>
                  <td>{delivery.attemptCount}</td>
                  <td>{delivery.responseStatus ?? delivery.errorMessage ?? '—'}</td>
                  <td>{new Date(delivery.createdAt).toLocaleString()}</td>
                  <td>
                    {delivery.status !== 'DELIVERED' && (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => retryDelivery(delivery.id)}
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedLayout>
  );
}
