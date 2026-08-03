'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

type Tab = 'suggestions' | 'recommendations' | 'regression';

interface AiSuggestion {
  id: string;
  suggestionType: string;
  status: string;
  confidence: number | null;
  suggestion: Record<string, unknown>;
  evidence: Record<string, unknown> | null;
  targetId: string | null;
  createdAt: string;
}

interface RegressionRun {
  id: string;
  overallStatus: string;
  scenarios: Array<{ id: string; label: string; status: string; message: string }>;
  createdAt: string;
}

export default function DomainAiPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [tab, setTab] = useState<Tab>('suggestions');
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [runs, setRuns] = useState<RegressionRun[]>([]);
  const [message, setMessage] = useState('');

  function loadSuggestions() {
    apiFetch<AiSuggestion[]>(`/domains/${domainId}/ai/suggestions`).then((r) => {
      if (r.data) setSuggestions(r.data);
    });
  }

  function loadRuns() {
    apiFetch<RegressionRun[]>(`/domains/${domainId}/ai/regression/runs`).then((r) => {
      if (r.data) setRuns(r.data);
    });
  }

  useEffect(() => {
    loadSuggestions();
    loadRuns();
  }, [domainId]);

  async function approve(id: string) {
    const r = await apiFetch(`/ai/suggestions/${id}/approve`, { method: 'POST' });
    setMessage(r.ok ? 'Suggestion applied' : r.error?.message ?? 'Failed');
    loadSuggestions();
  }

  async function reject(id: string) {
    const r = await apiFetch(`/ai/suggestions/${id}/reject`, { method: 'POST' });
    setMessage(r.ok ? 'Suggestion rejected' : r.error?.message ?? 'Failed');
    loadSuggestions();
  }

  async function runRecommendations() {
    const r = await apiFetch(`/domains/${domainId}/ai/compliance-recommendations`, { method: 'POST' });
    setMessage(r.ok ? 'Recommendations generated' : r.error?.message ?? 'Failed');
    loadSuggestions();
    setTab('suggestions');
  }

  async function runMisclassified() {
    const r = await apiFetch(`/domains/${domainId}/ai/misclassified-check`, { method: 'POST' });
    setMessage(r.ok ? 'Misclassification scan complete' : r.error?.message ?? 'Failed');
    loadSuggestions();
  }

  async function runBannerText() {
    const r = await apiFetch(`/domains/${domainId}/ai/banner-text`, {
      method: 'POST',
      body: JSON.stringify({ tone: 'professional' }),
    });
    setMessage(r.ok ? 'Banner text suggestion created' : r.error?.message ?? 'Failed');
    loadSuggestions();
  }

  async function runRegression() {
    const r = await apiFetch(`/domains/${domainId}/ai/regression/run`, { method: 'POST' });
    setMessage(r.ok ? 'Regression tests completed' : r.error?.message ?? 'Failed');
    loadRuns();
    setTab('regression');
  }

  return (
    <ProtectedLayout>
      <p>
        <Link href={`/domains/${domainId}`}>← Back to domain</Link> ·{' '}
        <Link href={`/domains/${domainId}/cookies`}>Cookies</Link>
      </p>
      <h1>AI compliance assistant</h1>
      <p style={{ color: 'var(--muted)' }}>
        Classification suggestions, compliance recommendations, and automated regression checks.
      </p>

      {message && <p className="success">{message}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {(['suggestions', 'recommendations', 'regression'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'btn' : 'btn btn-secondary'}
            onClick={() => setTab(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {tab === 'recommendations' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Generate recommendations</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Analyzes installation validation, published policy, and cookie review queue.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={runRecommendations}>
              Compliance recommendations
            </button>
            <button className="btn btn-secondary" type="button" onClick={runMisclassified}>
              Scan misclassified necessary cookies
            </button>
            <button className="btn btn-secondary" type="button" onClick={runBannerText}>
              Suggest banner text
            </button>
          </div>
        </div>
      )}

      {tab === 'suggestions' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>AI suggestions ({suggestions.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Preview</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.suggestionType}</code></td>
                  <td>{s.status}</td>
                  <td>{s.confidence != null ? `${Math.round(s.confidence)}%` : '—'}</td>
                  <td style={{ fontSize: '0.75rem', maxWidth: 320 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {JSON.stringify(s.suggestion, null, 2).slice(0, 200)}
                    </pre>
                  </td>
                  <td>
                    {s.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-secondary" type="button" onClick={() => approve(s.id)}>
                          Apply
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => reject(s.id)}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'regression' && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Regression test runs</h3>
            <button className="btn" type="button" onClick={runRegression}>Run tests</button>
          </div>
          {runs.map((run) => (
            <div key={run.id} style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p>
                <strong>{run.overallStatus}</strong> · {new Date(run.createdAt).toLocaleString()}
              </p>
              <ul style={{ fontSize: '0.875rem' }}>
                {run.scenarios?.map((s) => (
                  <li key={s.id}>
                    {s.status} — {s.label}: {s.message}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}
