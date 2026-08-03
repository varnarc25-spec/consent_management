'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { apiFetch, getApiUrl } from '@/lib/api';

interface PolicySnapshotBanner {
  title?: string;
  description?: string;
  acceptButton?: string;
  rejectButton?: string;
  preferencesButton?: string;
  legalNotice?: string;
  footerContent?: string;
}

interface ConsentProof {
  consentId: string;
  domainHostname: string;
  domainKey: string;
  visitorId: string;
  authenticatedUserId: string | null;
  consentStatus: string;
  eventType: string;
  collectionSource: string;
  categories: Record<string, boolean>;
  vendors: Record<string, boolean> | null;
  policyVersionId: string | null;
  configVersion: number;
  bannerVersion: number | null;
  region: string | null;
  language: string | null;
  regulation: string | null;
  proofHash: string;
  policySnapshotHash: string | null;
  policySnapshot: {
    banner?: PolicySnapshotBanner;
    categories?: Array<{ slug: string; name: string; description?: string | null }>;
  } | null;
  checksum: string;
  userAgent: string | null;
  ipAddressStored: boolean;
  createdAt: string;
  expiresAt: string | null;
  withdrawnAt: string | null;
  isLatest: boolean;
  history: Array<{
    id: string;
    consentStatus: string;
    eventType: string;
    collectionSource: string;
    createdAt: string;
  }>;
}

async function downloadProofExport(consentId: string, format: 'json' | 'csv' | 'pdf') {
  const tokenRes = await fetch('/api/auth/access-token', { credentials: 'include' });
  const tokenJson = (await tokenRes.json()) as { accessToken?: string };
  const url = `${getApiUrl()}/consent-records/${consentId}/export?format=${format}`;
  const response = await fetch(url, {
    headers: tokenJson.accessToken ? { Authorization: `Bearer ${tokenJson.accessToken}` } : {},
  });
  const blob = await response.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `consent-proof-${consentId}.${format}`;
  a.click();
}

export default function ConsentProofPage() {
  const params = useParams();
  const consentId = params.consentId as string;
  const [proof, setProof] = useState<ConsentProof | null>(null);

  useEffect(() => {
    apiFetch<ConsentProof>(`/consent-records/${consentId}`).then((r) => {
      if (r.data) setProof(r.data);
    });
  }, [consentId]);

  function onPrint() {
    window.print();
  }

  if (!proof) {
    return (
      <ProtectedLayout>
        <LoadingScreen message="Loading consent proof…" inline />
      </ProtectedLayout>
    );
  }

  const banner = proof.policySnapshot?.banner;

  return (
    <ProtectedLayout>
      <div className="consent-proof-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/consent-records" style={{ fontSize: '0.875rem' }}>← Back to consent logs</Link>
          <h1 style={{ marginTop: '0.5rem' }}>Proof of consent</h1>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onPrint} type="button">Print</button>
          <button className="btn btn-secondary" onClick={() => downloadProofExport(consentId, 'pdf')} type="button">
            Export PDF
          </button>
          <button className="btn btn-secondary" onClick={() => downloadProofExport(consentId, 'csv')} type="button">
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => downloadProofExport(consentId, 'json')} type="button">
            Export JSON
          </button>
        </div>
      </div>

      <div className="card consent-proof-print" style={{ marginTop: '1.5rem' }}>
        <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem 1rem' }}>
          <dt>Consent ID</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{proof.consentId}</dd>
          <dt>Domain</dt>
          <dd>{proof.domainHostname}</dd>
          <dt>Visitor ID</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{proof.visitorId}</dd>
          <dt>Authenticated user</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{proof.authenticatedUserId ?? '—'}</dd>
          <dt>Status</dt>
          <dd>{proof.consentStatus}{proof.isLatest ? ' (latest)' : ''}</dd>
          <dt>Event</dt>
          <dd>{proof.eventType}</dd>
          <dt>Collection source</dt>
          <dd>{proof.collectionSource}</dd>
          <dt>Recorded at</dt>
          <dd>{new Date(proof.createdAt).toLocaleString()}</dd>
          <dt>Expires</dt>
          <dd>{proof.expiresAt ? new Date(proof.expiresAt).toLocaleString() : '—'}</dd>
          <dt>Region / language</dt>
          <dd>{proof.region ?? '—'} / {proof.language ?? '—'}</dd>
          <dt>Regulation</dt>
          <dd>{proof.regulation ?? '—'}</dd>
          <dt>Policy version</dt>
          <dd>{proof.policyVersionId ?? '—'}</dd>
          <dt>Config / banner version</dt>
          <dd>{proof.configVersion} / {proof.bannerVersion ?? '—'}</dd>
          <dt>Verification hash</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>{proof.proofHash}</dd>
          <dt>Policy snapshot hash</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{proof.policySnapshotHash ?? '—'}</dd>
          <dt>IP stored (hashed)</dt>
          <dd>{proof.ipAddressStored ? 'Yes' : 'No'}</dd>
        </dl>

        {banner && (
          <>
            <h2 style={{ marginTop: '1.5rem' }}>Banner shown to visitor</h2>
            <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              {banner.title && <p><strong>Title:</strong> {banner.title}</p>}
              {banner.description && <p><strong>Description:</strong> {banner.description}</p>}
              {banner.acceptButton && <p><strong>Accept:</strong> {banner.acceptButton}</p>}
              {banner.rejectButton && <p><strong>Reject:</strong> {banner.rejectButton}</p>}
              {banner.legalNotice && <p><strong>Legal notice:</strong> {banner.legalNotice}</p>}
            </div>
          </>
        )}

        <h2 style={{ marginTop: '1.5rem' }}>Categories</h2>
        <ul>
          {Object.entries(proof.categories).map(([slug, enabled]) => (
            <li key={slug}>
              <strong>{slug}</strong>: {enabled ? 'Enabled' : 'Disabled'}
            </li>
          ))}
        </ul>

        {proof.vendors && Object.keys(proof.vendors).length > 0 && (
          <>
            <h2 style={{ marginTop: '1.5rem' }}>Vendors</h2>
            <ul>
              {Object.entries(proof.vendors).map(([vendor, allowed]) => (
                <li key={vendor}>
                  <strong>{vendor}</strong>: {allowed ? 'Allowed' : 'Denied'}
                </li>
              ))}
            </ul>
          </>
        )}

        {proof.history.length > 1 && (
          <>
            <h2 style={{ marginTop: '1.5rem' }}>Consent history</h2>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Event</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {proof.history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>{entry.consentStatus}</td>
                    <td>{entry.eventType}</td>
                    <td>{entry.collectionSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print,
          header.nav {
            display: none !important;
          }
          .container {
            max-width: none;
            padding: 0;
          }
        }
      `}</style>
    </ProtectedLayout>
  );
}
