'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  COOKIE_CATEGORY_LABELS,
  COOKIE_CATEGORY_ORDER,
} from '@/lib/cookie-categories';
import { apiFetch } from '@/lib/api';
import type { DomainCookieItem } from '@/components/website-cookies-inventory';

const DETAIL_TYPE_LABELS: Record<string, string> = {
  COOKIE: 'HTTP Cookie',
  LOCAL_STORAGE: 'HTML5 Local Storage',
  SESSION_STORAGE: 'HTML5 Session Storage',
  INDEXED_DB: 'IndexedDB',
  SCRIPT: 'Script',
  IFRAME: 'Iframe',
  PIXEL: 'Pixel',
  NETWORK_REQUEST: 'Network request',
  SERVICE_WORKER: 'Service worker',
};

interface CookieEditForm {
  category: string;
  provider: string;
  description: string;
  purpose: string;
  duration: string;
}

function buildForm(cookie: DomainCookieItem): CookieEditForm {
  return {
    category: cookie.category ?? 'unclassified',
    provider: cookie.provider ?? cookie.providerDomain ?? '',
    description: cookie.description ?? '',
    purpose: cookie.purpose ?? '',
    duration: cookie.duration ?? '',
  };
}

function getDetailTypeLabel(inventoryType: string) {
  return DETAIL_TYPE_LABELS[inventoryType] ?? inventoryType;
}

function parseExpiryDays(duration: string | null, expiresAt: string | null) {
  if (duration) {
    const match = duration.match(/(\d+)/);
    if (match) return match[1];
  }
  if (expiresAt) {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    return String(Math.max(0, days));
  }
  return '0';
}

function getDomainPath(sourceUrl: string | null, metadata: Record<string, unknown> | null) {
  const cookiePath = metadata?.cookiePath;
  if (typeof cookiePath === 'string' && cookiePath.length > 0) return cookiePath;
  if (sourceUrl) {
    try {
      return new URL(sourceUrl).pathname || '/';
    } catch {
      /* ignore */
    }
  }
  return '/';
}

function getFirstFoundUrl(cookie: DomainCookieItem) {
  const pageUrl = cookie.metadata?.pageUrl;
  if (typeof pageUrl === 'string' && pageUrl.length > 0) return pageUrl;
  return cookie.sourceUrl ?? '';
}

function getExampleValue(metadata: Record<string, unknown> | null) {
  const sample = metadata?.valueSample;
  return typeof sample === 'string' ? sample : '';
}

export function WebsiteCookiesRowDetail({
  domainId,
  cookie,
  onUpdated,
}: {
  domainId: string;
  cookie: DomainCookieItem;
  onUpdated: (cookie: DomainCookieItem) => void;
}) {
  const initialForm = useMemo(() => buildForm(cookie), [cookie]);
  const [form, setForm] = useState<CookieEditForm>(initialForm);
  const [defaultDescription, setDefaultDescription] = useState(cookie.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(buildForm(cookie));
    setDefaultDescription(cookie.description ?? '');
    setError('');
  }, [cookie]);

  const isDirty =
    form.category !== initialForm.category ||
    form.provider !== initialForm.provider ||
    form.description !== initialForm.description ||
    form.purpose !== initialForm.purpose ||
    form.duration !== initialForm.duration;

  const secure = cookie.metadata?.secure === true;
  const httpOnly = cookie.metadata?.httpOnly === true;
  const exampleValue = getExampleValue(cookie.metadata);
  const firstFoundUrl = getFirstFoundUrl(cookie);
  const domainPath = getDomainPath(cookie.sourceUrl, cookie.metadata);
  const expiryDays = parseExpiryDays(cookie.duration, cookie.expiresAt);

  async function handleSave() {
    setSaving(true);
    setError('');
    const res = await apiFetch<DomainCookieItem>(
      `/domains/${domainId}/cookies/${cookie.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          category: form.category,
          provider: form.provider || undefined,
          description: form.description || undefined,
          purpose: form.purpose || undefined,
          duration: form.duration || undefined,
          reviewStatus: 'APPROVED',
        }),
      },
    );
    setSaving(false);
    if (res.data) {
      onUpdated(res.data);
      setDefaultDescription(res.data.description ?? '');
    } else if (res.error) {
      setError(res.error.message);
    }
  }

  function handleDiscard() {
    setForm(buildForm(cookie));
    setError('');
  }

  function handleResetDescription() {
    setForm((current) => ({ ...current, description: defaultDescription }));
  }

  return (
    <div className="cookies-report-row-detail">
      <div className="cookies-report-row-detail-actions">
        <button
          type="button"
          className="cookies-report-detail-btn cookies-report-detail-btn-muted"
          disabled={!isDirty || saving}
          onClick={handleDiscard}
        >
          Discard changes
        </button>
        <button
          type="button"
          className="cookies-report-detail-btn cookies-report-detail-btn-primary"
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {error && <p className="error cookies-report-row-detail-error">{error}</p>}

      <div className="cookies-report-detail-grid">
        <section className="cookies-report-detail-panel">
          <h3>Information</h3>

          <div className="cookies-report-detail-section">
            <h4>Cookie/tracker identification</h4>
            <div className="cookies-report-field-grid cookies-report-field-grid-2">
              <label className="cookies-report-field">
                <span>Name</span>
                <input type="text" value={cookie.cookieName} readOnly />
              </label>
              <label className="cookies-report-field">
                <span>Country</span>
                <input type="text" value="" placeholder="—" readOnly />
              </label>
            </div>
            <label className="cookies-report-field">
              <span>Example value</span>
              <input type="text" value={exampleValue} placeholder="—" readOnly />
            </label>
            <div className="cookies-report-field-grid cookies-report-field-grid-2">
              <label className="cookies-report-field">
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {COOKIE_CATEGORY_ORDER.map((slug) => (
                    <option key={slug} value={slug}>
                      {COOKIE_CATEGORY_LABELS[slug] ?? slug}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cookies-report-field">
                <span>Provider</span>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="cookies-report-detail-section">
            <h4>Cookie/Tracker purpose description</h4>
            <div className="cookies-report-lang-tab" aria-hidden="true">English</div>
            <label className="cookies-report-field">
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe what this cookie or tracker is used for…"
              />
            </label>
            <p className="cookies-report-field-hint">
              Custom text overwrites the default description.{' '}
              <button
                type="button"
                className="cookies-report-link-btn"
                onClick={handleResetDescription}
              >
                Reset to default
              </button>
            </p>
          </div>
        </section>

        <section className="cookies-report-detail-panel">
          <h3>Details</h3>
          <div className="cookies-report-details-split">
            <div className="cookies-report-detail-section">
              <h4>Tracker details</h4>
              <label className="cookies-report-field">
                <span>Type</span>
                <input
                  type="text"
                  value={getDetailTypeLabel(cookie.inventoryType)}
                  readOnly
                />
              </label>
              <label className="cookies-report-field">
                <span>Expiry (in days)</span>
                <input
                  type="text"
                  value={form.duration ? parseExpiryDays(form.duration, cookie.expiresAt) : expiryDays}
                  readOnly
                />
              </label>
              <div className="cookies-report-checks">
                <label className="cookies-report-check">
                  <input type="checkbox" checked={secure} readOnly disabled />
                  <span>Secure</span>
                </label>
                <label className="cookies-report-check">
                  <input type="checkbox" checked={httpOnly} readOnly disabled />
                  <span>HTTP only</span>
                </label>
              </div>
            </div>

            <div className="cookies-report-detail-section">
              <h4>Scan details</h4>
              <label className="cookies-report-field">
                <span>First found URL</span>
                <input type="text" value={firstFoundUrl} readOnly />
              </label>
              <label className="cookies-report-field">
                <span>Domain path</span>
                <input type="text" value={domainPath} readOnly />
              </label>
              {cookie.sourceUrl && (
                <label className="cookies-report-field">
                  <span>Source URL</span>
                  <input type="text" value={cookie.sourceUrl} readOnly />
                </label>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
