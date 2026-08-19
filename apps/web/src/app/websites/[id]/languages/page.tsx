'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { WebsiteLayout } from '@/components/website-layout';
import { WebsiteScanStatus } from '@/components/website-scan-context';
import { apiFetch } from '@/lib/api';
import { COMMON_LANGUAGE_OPTIONS } from '@cmp/utils';

interface PolicyDraft {
  id: string;
  supportedLanguages?: string[] | null;
  legalText?: { defaultLanguage?: string } | null;
}

export default function LanguagesPage() {
  const params = useParams();
  const domainId = params.id as string;
  const [hostname, setHostname] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['en']);
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ hostname: string }>(`/domains/${domainId}`, { silent: true }).then((r) => {
      if (r.data) setHostname(r.data.hostname);
    });
    apiFetch<PolicyDraft>(`/domains/${domainId}/consent/policies/draft`).then((r) => {
      if (!r.data) return;
      setDraftId(r.data.id);
      const langs = (r.data.supportedLanguages as string[] | null) ?? ['en'];
      setSupportedLanguages(langs.length ? langs : ['en']);
      setDefaultLanguage(r.data.legalText?.defaultLanguage ?? langs[0] ?? 'en');
    });
  }, [domainId]);

  function toggleLanguage(code: string) {
    setSupportedLanguages((current) => {
      if (current.includes(code)) {
        if (code === defaultLanguage) return current;
        const next = current.filter((item) => item !== code);
        return next.length ? next : ['en'];
      }
      return [...current, code];
    });
  }

  async function saveLanguages(e: FormEvent) {
    e.preventDefault();
    if (!draftId) return;
    setSaving(true);
    setError('');
    setMessage('');
    const languages = supportedLanguages.includes(defaultLanguage)
      ? supportedLanguages
      : [defaultLanguage, ...supportedLanguages];
    const result = await apiFetch(`/domains/${domainId}/consent/policies/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        supportedLanguages: languages,
        legalText: { defaultLanguage },
      }),
    });
    setSaving(false);
    if (result.ok) {
      setSupportedLanguages(languages);
      setMessage('Languages saved to draft. Publish from Cookie Banner to go live.');
    } else {
      setError(result.error?.message ?? 'Failed to save languages');
    }
  }

  return (
    <ProtectedLayout>
      <WebsiteLayout domainId={domainId} hostname={hostname || undefined}>
        <div className="website-page-header website-page-header-end">
          <WebsiteScanStatus />
        </div>
        <form className="card" style={{ padding: '1.25rem' }} onSubmit={saveLanguages}>
          <h2 style={{ marginTop: 0 }}>Languages</h2>
          <p className="website-section-muted">
            Banner and preference-center languages for {hostname || 'this website'}. Add translations
            for each language in Cookie Banner settings.
          </p>
          <div className="field">
            <label htmlFor="defaultLanguage">Default language</label>
            <select
              id="defaultLanguage"
              value={defaultLanguage}
              onChange={(e) => {
                const next = e.target.value;
                setDefaultLanguage(next);
                setSupportedLanguages((current) =>
                  current.includes(next) ? current : [...current, next],
                );
              }}
            >
              {COMMON_LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: '1rem 0' }}>
            <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Supported languages</legend>
            <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {COMMON_LANGUAGE_OPTIONS.map((lang) => (
                <label key={lang.code} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={supportedLanguages.includes(lang.code)}
                    disabled={lang.code === defaultLanguage}
                    onChange={() => toggleLanguage(lang.code)}
                  />
                  {lang.label}
                  {lang.rtl ? ' (RTL)' : ''}
                </label>
              ))}
            </div>
          </fieldset>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={saving || !draftId}>
              {saving ? 'Saving…' : 'Save languages'}
            </button>
            <Link className="btn btn-secondary" href={`/websites/${domainId}/consent`}>
              Open Cookie Banner
            </Link>
          </div>
          {(message || error) && (
            <p className={error ? 'error' : 'success'} style={{ marginTop: '1rem' }} role="status">
              {error || message}
            </p>
          )}
        </form>
      </WebsiteLayout>
    </ProtectedLayout>
  );
}
