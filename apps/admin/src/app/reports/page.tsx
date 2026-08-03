'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch, getApiUrl } from '@/lib/api';

interface Schedule {
  id: string;
  reportType: string;
  frequency: string;
  deliveryEmail: string | null;
  enabled: boolean;
  nextRunAt: string | null;
}

interface ReportRun {
  id: string;
  reportType: string;
  status: string;
  deliveredTo: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    reportType: 'COMPLIANCE',
    frequency: 'WEEKLY',
    deliveryEmail: '',
  });

  function load() {
    apiFetch<Schedule[]>('/insights/report-schedules').then((r) => {
      if (r.data) setSchedules(r.data);
    });
    apiFetch<ReportRun[]>('/insights/report-runs').then((r) => {
      if (r.data) setRuns(r.data);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function getAccessToken() {
    const tokenRes = await fetch('/api/auth/access-token', { credentials: 'include' });
    const tokenJson = (await tokenRes.json()) as { accessToken?: string };
    return tokenJson.accessToken;
  }

  async function downloadCompliance(format: 'json' | 'xlsx') {
    const accessToken = await getAccessToken();
    const suffix = format === 'xlsx' ? 'compliance.xlsx' : 'compliance';
    const url = `${getApiUrl()}/insights/reports/${suffix}`;
    const res = await fetch(url, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!res.ok) {
      setMessage('Download failed');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    if (format === 'xlsx') {
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `compliance-report-${date}.xlsx`;
      a.click();
      return;
    }
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json.data ?? json, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `compliance-report-${date}.json`;
    a.click();
  }

  async function createSchedule(e: FormEvent) {
    e.preventDefault();
    const result = await apiFetch('/insights/report-schedules', {
      method: 'POST',
      body: JSON.stringify({
        reportType: form.reportType,
        frequency: form.frequency,
        deliveryEmail: form.deliveryEmail || undefined,
      }),
    });
    if (result.ok) {
      setMessage('Schedule created');
      load();
    } else {
      setMessage(result.error?.message ?? 'Failed to create schedule');
    }
  }

  async function runSchedule(id: string) {
    const result = await apiFetch(`/insights/report-schedules/${id}/run`, { method: 'POST' });
    setMessage(result.ok ? 'Report sent' : result.error?.message ?? 'Run failed');
    load();
  }

  return (
    <ProtectedLayout>
      <h1>Reports</h1>
      <p style={{ color: 'var(--muted)' }}>Generate compliance reports and schedule delivery.</p>

      {message && <p className="success">{message}</p>}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Generate now</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={() => downloadCompliance('json')}>
            Download compliance report (JSON)
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => downloadCompliance('xlsx')}>
            Download compliance report (XLSX)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Schedule report</h3>
        <form onSubmit={createSchedule}>
          <div className="field">
            <label htmlFor="reportType">Report type</label>
            <select
              id="reportType"
              value={form.reportType}
              onChange={(e) => setForm({ ...form, reportType: e.target.value })}
            >
              <option value="COMPLIANCE">Compliance</option>
              <option value="SCAN_SUMMARY">Scan summary</option>
              <option value="CONSENT_EXPORT">Consent export link</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="frequency">Frequency</label>
            <select
              id="frequency"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="deliveryEmail">Delivery email</label>
            <input
              id="deliveryEmail"
              type="email"
              value={form.deliveryEmail}
              onChange={(e) => setForm({ ...form, deliveryEmail: e.target.value })}
              required
            />
          </div>
          <button className="btn" type="submit">Create schedule</button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Scheduled reports</h3>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Frequency</th>
              <th>Email</th>
              <th>Next run</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.reportType}</td>
                <td>{s.frequency}</td>
                <td>{s.deliveryEmail ?? '—'}</td>
                <td>{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'}</td>
                <td>
                  <button className="btn btn-secondary" type="button" onClick={() => runSchedule(s.id)}>
                    Run now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Recent runs</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Status</th>
              <th>Delivered to</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.reportType}</td>
                <td>{r.status}</td>
                <td>{r.deliveredTo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedLayout>
  );
}
