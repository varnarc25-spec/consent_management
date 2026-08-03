'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch, getApiUrl } from '@/lib/api';

interface ConsentRecordItem {
  id: string;
  domainId: string;
  domainHostname: string;
  visitorId: string;
  consentStatus: string;
  eventType: string;
  collectionSource: string;
  region: string | null;
  proofHash: string;
  createdAt: string;
}

interface DomainOption {
  id: string;
  hostname: string;
}

export default function ConsentRecordsPage() {
  const [items, setItems] = useState<ConsentRecordItem[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [filters, setFilters] = useState({
    domainId: '',
    visitorId: '',
    consentId: '',
    from: '',
    to: '',
    consentStatus: '',
    region: '',
    regulation: '',
  });

  useEffect(() => {
    apiFetch<DomainOption[]>('/domains').then((r) => {
      if (r.data) setDomains(r.data);
    });
    load();
  }, []);

  function load() {
    const params = new URLSearchParams();
    if (filters.domainId) params.set('domainId', filters.domainId);
    if (filters.visitorId) params.set('visitorId', filters.visitorId);
    if (filters.consentId) params.set('consentId', filters.consentId);
    if (filters.from) params.set('from', new Date(filters.from).toISOString());
    if (filters.to) params.set('to', new Date(filters.to).toISOString());
    if (filters.consentStatus) params.set('consentStatus', filters.consentStatus);
    if (filters.region) params.set('region', filters.region);
    if (filters.regulation) params.set('regulation', filters.regulation);
    const qs = params.toString();
    apiFetch<{ items: ConsentRecordItem[] }>(`/consent-records${qs ? `?${qs}` : ''}`).then((r) => {
      if (r.data) setItems(r.data.items);
    });
  }

  function onFilter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    load();
  }

  async function onExport(format: 'csv' | 'json') {
    const tokenRes = await fetch('/api/auth/access-token', { credentials: 'include' });
    const tokenJson = (await tokenRes.json()) as { accessToken?: string };
    const params = new URLSearchParams();
    if (filters.domainId) params.set('domainId', filters.domainId);
    if (filters.visitorId) params.set('visitorId', filters.visitorId);
    if (filters.consentId) params.set('consentId', filters.consentId);
    if (filters.from) params.set('from', new Date(filters.from).toISOString());
    if (filters.to) params.set('to', new Date(filters.to).toISOString());
    if (filters.consentStatus) params.set('consentStatus', filters.consentStatus);
    if (filters.region) params.set('region', filters.region);
    if (filters.regulation) params.set('regulation', filters.regulation);
    params.set('format', format);
    const url = `${getApiUrl()}/consent-records/export?${params.toString()}`;
    fetch(url, {
      headers: tokenJson.accessToken ? { Authorization: `Bearer ${tokenJson.accessToken}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `consent-records-${new Date().toISOString().slice(0, 10)}.${format}`;
        a.click();
      });
  }

  return (
    <ProtectedLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h1>Consent logs</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => onExport('csv')} type="button">
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => onExport('json')} type="button">
            Export JSON
          </button>
        </div>
      </div>

      <form
        className="card"
        style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
        onSubmit={onFilter}
      >
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
          <label htmlFor="domainId">Domain</label>
          <select
            id="domainId"
            value={filters.domainId}
            onChange={(e) => setFilters({ ...filters, domainId: e.target.value })}
          >
            <option value="">All domains</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>{domain.hostname}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
          <label htmlFor="visitorId">Visitor ID</label>
          <input
            id="visitorId"
            value={filters.visitorId}
            onChange={(e) => setFilters({ ...filters, visitorId: e.target.value })}
            placeholder="v_..."
          />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
          <label htmlFor="consentId">Consent ID</label>
          <input
            id="consentId"
            value={filters.consentId}
            onChange={(e) => setFilters({ ...filters, consentId: e.target.value })}
            placeholder="UUID"
          />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
          <label htmlFor="consentStatus">Status</label>
          <select
            id="consentStatus"
            value={filters.consentStatus}
            onChange={(e) => setFilters({ ...filters, consentStatus: e.target.value })}
          >
            <option value="">Any</option>
            <option value="GRANTED">Granted</option>
            <option value="PARTIAL">Partial</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 100 }}>
          <label htmlFor="region">Region</label>
          <input
            id="region"
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
            placeholder="EU, US"
          />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 100 }}>
          <label htmlFor="regulation">Regulation</label>
          <input
            id="regulation"
            value={filters.regulation}
            onChange={(e) => setFilters({ ...filters, regulation: e.target.value })}
            placeholder="GDPR, CCPA"
          />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
          <label htmlFor="from">From</label>
          <input
            id="from"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 120 }}>
          <label htmlFor="to">To</label>
          <input
            id="to"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
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
              <th>Domain</th>
              <th>Visitor</th>
              <th>Status</th>
              <th>Event</th>
              <th>Source</th>
              <th>Proof</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: 'var(--muted)' }}>No consent records yet</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.domainHostname}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.visitorId}</td>
                  <td>{item.consentStatus}</td>
                  <td>{item.eventType}</td>
                  <td>{item.collectionSource}</td>
                  <td>
                    <Link href={`/consent-records/${item.id}`}>View proof</Link>
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
