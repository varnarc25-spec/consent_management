'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { LoadingScreen } from '@/components/loading-screen';
import { type DomainCookieItem } from '@/components/website-cookies-inventory';
import { WebsiteCookiesReport } from '@/components/website-cookies-report';
import { WebsiteLayout } from '@/components/website-layout';
import { apiFetch } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
  verificationStatus: string;
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
          {error && <p className="error">{error}</p>}
          <WebsiteCookiesReport
            domainId={domain.id}
            hostname={domain.hostname}
            cookies={cookies}
            loading={loading}
            onCookieUpdated={(updated) =>
              setCookies((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
              )
            }
          />
        </WebsiteLayout>
      )}
    </ProtectedLayout>
  );
}
