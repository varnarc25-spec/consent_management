'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import {
  type DomainCookieItem,
  WebsiteCookiesInventory,
} from '@/components/website-cookies-inventory';
import { WebsiteDomainOverview } from '@/components/website-domain-overview';
import { WebsiteLayout } from '@/components/website-layout';
import { WebsiteSetupSteps } from '@/components/website-setup-steps';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
  verificationStatus: string;
  sdkLastSeenAt: string | null;
  scanLimit: number;
  scanFrequency: string;
  nextScanAt: string | null;
}

export default function WebsiteCookiesPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [cookies, setCookies] = useState<DomainCookieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
      const [domainRes, cookiesRes] = await Promise.all([
        apiFetch<Domain>(`/domains/${domainId}`),
        apiFetch<DomainCookieItem[]>(`/domains/${domainId}/cookies`),
      ]);
      if (domainRes.data) setDomain(domainRes.data);
      if (cookiesRes.data) setCookies(cookiesRes.data);
      if (!domainRes.data && domainRes.error) {
        setError(domainRes.error.message);
      }
      setLoading(false);
    }
    load();
  }, [domainId]);

  return (
    <ProtectedLayout>
      {loading && !domain ? (
        <LoadingScreen message="Loading cookies…" inline />
      ) : !domain ? (
        <div className="card">
          <p className="error">{error || 'Website not found.'}</p>
        </div>
      ) : (
        <WebsiteLayout
          domainId={domainId}
          hostname={domain.hostname}
          domainKey={domain.domainKey}
          verificationStatus={domain.verificationStatus}
        >
          <div className="website-page-header">
            <div>
              <h1 className="website-cookies-page-title">Cookies &amp; trackers</h1>
              <p className="page-subtitle">
                Detailed inventory for <strong>{domain.hostname}</strong>
              </p>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="website-setup-overview-row">
            <div className="card website-setup-card">
              <WebsiteSetupSteps
                domainId={domain.id}
                hostname={domain.hostname}
                verificationStatus={domain.verificationStatus}
                sdkLastSeenAt={domain.sdkLastSeenAt}
              />
            </div>

            <div className="card website-overview-main-card">
              <WebsiteDomainOverview
                domainId={domain.id}
                hostname={domain.hostname}
                scanLimit={domain.scanLimit}
                scanFrequency={domain.scanFrequency}
                nextScanAt={domain.nextScanAt}
              />
            </div>
          </div>

          <div className="card website-domain-merged" style={{ marginTop: '1.5rem' }}>
            <section className="website-domain-section">
              <div className="website-install-validate-header">
                <h3>Cookie &amp; tracker inventory</h3>
                <span className="card-meta">{cookies.length} items</span>
              </div>
              <WebsiteCookiesInventory
                cookies={cookies}
                loading={loading}
              />
            </section>
          </div>
        </WebsiteLayout>
      )}
    </ProtectedLayout>
  );
}
