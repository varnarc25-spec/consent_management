'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { apiFetch, getApiUrl } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
}

export default function TestBannerPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    apiFetch<Domain>(`/domains/${domainId}`).then((r) => {
      if (r.data) setDomain(r.data);
    });
  }, [domainId]);

  useEffect(() => {
    if (!domain || scriptLoaded) return;

    const script = document.createElement('script');
    script.src = `${getApiUrl()}/public/cmp/sdk.js`;
    script.async = true;
    script.setAttribute('data-domain-key', domain.domainKey);
    script.setAttribute('data-env', 'production');
    script.setAttribute('data-debug', 'true');
    script.setAttribute('data-test-scripts', 'true');
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.querySelectorAll('[data-cmp-banner]').forEach((el) => el.remove());
    };
  }, [domain, scriptLoaded]);

  return (
    <ProtectedLayout>
      <WebsiteLayout domainId={domainId} hostname={domain?.hostname}>
      <h1>Test banner</h1>
      <p style={{ color: 'var(--muted)' }}>
        Live preview of the published banner for <strong>{domain?.hostname ?? '…'}</strong>.
        Publish your banner draft first, then interact with the banner below.
      </p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          Domain key: <code>{domain?.domainKey ?? 'loading…'}</code>
        </p>
        <button
          className="btn btn-secondary"
          type="button"
          style={{ marginTop: '1rem' }}
          onClick={() => window.__CMP__?.showBanner?.()}
        >
          Show banner again
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          style={{ marginTop: '1rem', marginLeft: '0.5rem' }}
          onClick={() => window.__CMP__?.openPreferences?.()}
        >
          Open preferences
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          style={{ marginTop: '1rem', marginLeft: '0.5rem' }}
          onClick={() => {
            if (domain) {
              localStorage.removeItem(`cmp_consent_${domain.domainKey}`);
              window.location.reload();
            }
          }}
        >
          Clear consent &amp; reload
        </button>
      </div>

      <div
        className="card"
        style={{
          marginTop: '1.5rem',
          minHeight: 320,
          background: 'linear-gradient(180deg, #eef2ff, #f8fafc)',
        }}
      >
        <h3>Sample page content</h3>
        <p style={{ color: 'var(--muted)' }}>
          Scroll and interact with the banner. Use Tab to test keyboard navigation. Press Escape
          on modal layouts to close or go back.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. The CMP SDK loads on this page
          exactly as it would on your website.
        </p>
      </div>
      </WebsiteLayout>
    </ProtectedLayout>
  );
}

declare global {
  interface Window {
    __CMP__?: {
      showBanner?: () => void;
      openPreferences?: () => void;
    };
  }
}
