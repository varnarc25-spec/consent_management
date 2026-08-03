'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { apiFetch, getApiUrl } from '@/lib/api';

interface Domain {
  id: string;
  hostname: string;
  domainKey: string;
}

const PREVIEW_COUNTRIES = [
  { code: '', label: 'Auto-detect' },
  { code: 'DE', label: 'Germany (EU / GDPR)' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'BR', label: 'Brazil (LGPD)' },
  { code: 'CA', label: 'Canada (PIPEDA)' },
  { code: 'JP', label: 'Japan (default profile)' },
];

function BlockingStatus() {
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  const [inlineRan, setInlineRan] = useState(false);
  const [geoInfo, setGeoInfo] = useState('');

  useEffect(() => {
    const sync = () => {
      const cmp = window.__CMP__;
      if (cmp?.getConsent) setConsent(cmp.getConsent());
      setInlineRan(Boolean(window.__cmpInlineRan));
      const cfg = window.CMP as { getConfig?: () => { region?: string; applicableRegulation?: string } } | undefined;
      if (cfg?.getConfig) {
        const config = cfg.getConfig();
        setGeoInfo(`${config.region ?? '—'} · ${config.applicableRegulation ?? '—'}`);
      }
    };
    sync();
    document.addEventListener('cmp:consent-update', sync);
    document.addEventListener('cmp:ready', sync);
    return () => {
      document.removeEventListener('cmp:consent-update', sync);
      document.removeEventListener('cmp:ready', sync);
    };
  }, []);

  return (
    <ul style={{ fontSize: '0.875rem', marginTop: '0.75rem' }}>
      <li>Detected region / regulation: {geoInfo || '—'}</li>
      <li>Analytics consent: {consent.analytics ? 'granted' : 'denied'}</li>
      <li>Marketing consent: {consent.marketing ? 'granted' : 'denied'}</li>
      <li>Social media consent: {consent.social_media ? 'granted' : 'denied'}</li>
      <li>Inline analytics script executed: {inlineRan ? 'yes' : 'no'}</li>
    </ul>
  );
}

export default function TestBannerPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [previewCountry, setPreviewCountry] = useState('');

  useEffect(() => {
    apiFetch<Domain>(`/domains/${domainId}`).then((r) => {
      if (r.data) setDomain(r.data);
    });
  }, [domainId]);

  useEffect(() => {
    if (!domain) return;

    const container = document.getElementById('cmp-blocking-fixtures');
    if (!container || container.dataset.mounted === 'true') return;
    container.dataset.mounted = 'true';

    const inline = document.createElement('script');
    inline.setAttribute('data-cmp-category', 'analytics');
    inline.textContent = 'window.__cmpInlineRan = true;';
    container.appendChild(inline);

    const external = document.createElement('script');
    external.setAttribute('data-cmp-category', 'marketing');
    external.src = 'https://connect.facebook.net/en_US/fbevents.js';
    external.async = true;
    container.appendChild(external);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('data-cmp-category', 'social_media');
    iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    iframe.width = '560';
    iframe.height = '315';
    iframe.title = 'Blocked YouTube embed';
    iframe.style.maxWidth = '100%';
    container.appendChild(iframe);

    const pixel = document.createElement('img');
    pixel.setAttribute('data-cmp-category', 'marketing');
    pixel.src = 'https://www.facebook.com/tr?id=123456789&ev=PageView';
    pixel.width = 1;
    pixel.height = 1;
    pixel.alt = '';
    pixel.style.opacity = '0.4';
    container.appendChild(pixel);
  }, [domain]);

  useEffect(() => {
    if (!domain) return;

    document.querySelectorAll('script[data-domain-key]').forEach((el) => el.remove());
    document.querySelectorAll('[data-cmp-banner]').forEach((el) => el.remove());
    setScriptLoaded(false);

    const script = document.createElement('script');
    script.src = `${getApiUrl()}/public/cmp/sdk.js`;
    script.async = true;
    script.setAttribute('data-domain-key', domain.domainKey);
    script.setAttribute('data-env', 'production');
    script.setAttribute('data-debug', 'true');
    script.setAttribute('data-test-scripts', 'true');
    if (previewCountry) {
      script.setAttribute('data-preview-country', previewCountry);
    }
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [domain, previewCountry]);

  return (
    <ProtectedLayout>
      <p>
        <Link href={`/domains/${domainId}/consent`}>← Back to consent configuration</Link>
      </p>
      <h1>Test banner</h1>
      <p style={{ color: 'var(--muted)' }}>
        Live preview of the published banner for <strong>{domain?.hostname ?? '…'}</strong>.
        Publish your banner draft first, then interact with the banner below.
      </p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="field">
          <label htmlFor="previewCountry">Preview visitor country</label>
          <select
            id="previewCountry"
            value={previewCountry}
            onChange={(e) => {
              if (domain) {
                localStorage.removeItem(`cmp_consent_${domain.domainKey}`);
              }
              setPreviewCountry(e.target.value);
            }}
          >
            {PREVIEW_COUNTRIES.map((item) => (
              <option key={item.code || 'auto'} value={item.code}>{item.label}</option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          Domain key: <code>{domain?.domainKey ?? 'loading…'}</code>
          {scriptLoaded ? ' · SDK loaded' : ' · Loading SDK…'}
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
        style={{ marginTop: '1.5rem' }}
        id="cmp-blocking-fixtures"
      >
        <h3>Blocking fixtures</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Inline script, external script, iframe, and tracking pixel below should block until consent.
        </p>
        <BlockingStatus />
      </div>
    </ProtectedLayout>
  );
}
