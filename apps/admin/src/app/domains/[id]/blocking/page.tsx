'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch } from '@/lib/api';

interface Violation {
  id: string;
  url: string;
  resourceType: string;
  category: string | null;
  vendor: string | null;
  rulePattern: string | null;
  pageUrl: string | null;
  createdAt: string;
}

interface BlockingRules {
  categoryRules: Array<{
    slug: string;
    name: string;
    scriptMappings: unknown;
  }>;
  vendorPatterns: Array<{
    vendor: string;
    category: string;
    patterns: string[];
  }>;
  knownTrackerPatterns: Array<{
    category: string;
    type: string;
    pattern: string;
  }>;
}

export default function DomainBlockingPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<BlockingRules | null>(null);

  useEffect(() => {
    apiFetch<Violation[]>(`/domains/${domainId}/blocking/violations`).then((r) => {
      if (r.data) setViolations(r.data);
    });
    apiFetch<BlockingRules>(`/domains/${domainId}/blocking/rules`).then((r) => {
      if (r.data) setRules(r.data);
    });
  }, [domainId]);

  return (
    <ProtectedLayout>
      <p>
        <Link href={`/domains/${domainId}`}>← Back to domain</Link> ·{' '}
        <Link href={`/domains/${domainId}/test-banner`}>Test banner</Link>
      </p>
      <h1>Automatic blocking</h1>
      <p style={{ color: 'var(--muted)' }}>
        Rules engine, vendor patterns, and pre-consent violation log.
      </p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Blocking debugger</h3>
        <ol style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
          <li>
            Open <Link href={`/domains/${domainId}`}>domain settings</Link> and enable{' '}
            <strong>Debug mode</strong> (or add <code>?cmp_debug=1</code> to your site URL).
          </li>
          <li>
            Visit your site with the CMP script installed. A floating debugger panel shows blocked
            requests, allowed scripts, and category mappings in real time.
          </li>
          <li>
            Edit category script mappings on the{' '}
            <Link href={`/consent?domainId=${domainId}`}>Consent configuration</Link> page — regional
            rules apply when a mapping includes a <code>regions</code> array.
          </li>
          <li>
            Pre-consent violations below are reported automatically from production traffic when
            automatic blocking is enabled.
          </li>
        </ol>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Blocking rules</h3>
        {!rules ? (
          <p>Loading rules…</p>
        ) : (
          <>
            <h4>Category mappings</h4>
            <ul>
              {rules.categoryRules.map((category) => (
                <li key={category.slug}>
                  <strong>{category.name}</strong> <code>{category.slug}</code>
                  {category.scriptMappings ? (
                    <pre style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {JSON.stringify(category.scriptMappings, null, 2)}
                    </pre>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}> — no custom mappings</span>
                  )}
                </li>
              ))}
            </ul>
            <h4 style={{ marginTop: '1rem' }}>Vendor patterns ({rules.vendorPatterns.length})</h4>
            <ul style={{ fontSize: '0.875rem' }}>
              {rules.vendorPatterns.slice(0, 12).map((vendor) => (
                <li key={`${vendor.vendor}-${vendor.category}`}>
                  {vendor.vendor} → <code>{vendor.category}</code> ({vendor.patterns.length} patterns)
                </li>
              ))}
            </ul>
            <h4 style={{ marginTop: '1rem' }}>Built-in tracker patterns</h4>
            <ul style={{ fontSize: '0.875rem' }}>
              {rules.knownTrackerPatterns.map((item) => (
                <li key={`${item.type}-${item.pattern}`}>
                  <code>{item.type}</code> · {item.pattern} → <code>{item.category}</code>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Pre-consent violations ({violations.length})</h3>
        {violations.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No violations recorded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Category</th>
                <th>URL</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td><code>{item.resourceType}</code></td>
                  <td>{item.category ?? '—'}</td>
                  <td><code style={{ fontSize: '0.75rem' }}>{item.url}</code></td>
                  <td>{item.rulePattern ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ProtectedLayout>
  );
}
