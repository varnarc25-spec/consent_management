'use client';

import { COOKIE_CATEGORY_LABELS } from '@/lib/cookie-categories';

export interface DomainCookieItem {
  id: string;
  cookieName: string;
  cookieDomain: string | null;
  provider: string | null;
  providerDomain: string | null;
  category: string | null;
  description: string | null;
  purpose: string | null;
  duration: string | null;
  isThirdParty: boolean | null;
  riskLevel: string | null;
  reviewStatus: string;
  inventoryType: string;
  foundBeforeConsent: boolean;
  seenCount: number;
  lastSeenAt: string;
  sourceUrl: string | null;
}

const INVENTORY_TYPE_LABELS: Record<string, string> = {
  COOKIE: 'Cookie',
  LOCAL_STORAGE: 'Local storage',
  SESSION_STORAGE: 'Session storage',
  INDEXED_DB: 'IndexedDB',
  SCRIPT: 'Script',
  IFRAME: 'Iframe',
  PIXEL: 'Pixel',
  NETWORK_REQUEST: 'Network',
  SERVICE_WORKER: 'Service worker',
};

function formatInventoryType(type: string) {
  return INVENTORY_TYPE_LABELS[type] ?? type;
}

export function WebsiteCookiesInventory({
  cookies,
  loading = false,
  emptyMessage = 'No cookies or trackers yet. Run a homepage scan to build your inventory.',
}: {
  cookies: DomainCookieItem[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  if (loading) {
    return <p className="website-section-muted">Loading inventory…</p>;
  }

  if (cookies.length === 0) {
    return <p className="website-section-muted">{emptyMessage}</p>;
  }

  return (
    <div className="data-table-wrap website-cookies-inventory-wrap">
      <table className="data-table website-cookies-inventory-table">
        <colgroup>
          <col className="website-cookies-inventory-col-name" />
          <col className="website-cookies-inventory-col-type" />
          <col className="website-cookies-inventory-col-category" />
          <col className="website-cookies-inventory-col-provider" />
          <col className="website-cookies-inventory-col-duration" />
          <col className="website-cookies-inventory-col-flag" />
          <col className="website-cookies-inventory-col-flag" />
          <col className="website-cookies-inventory-col-risk" />
          <col className="website-cookies-inventory-col-status" />
          <col className="website-cookies-inventory-col-seen" />
          <col className="website-cookies-inventory-col-last" />
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Category</th>
            <th>Provider</th>
            <th>Duration</th>
            <th>Third party</th>
            <th>Before consent</th>
            <th>Risk</th>
            <th>Status</th>
            <th>Seen</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie) => (
            <tr key={cookie.id}>
              <td className="website-cookies-inventory-name">
                <strong>{cookie.cookieName}</strong>
                {cookie.cookieDomain ? (
                  <span className="website-cookies-inventory-sub">{cookie.cookieDomain}</span>
                ) : null}
                {cookie.description ? (
                  <span className="website-cookies-inventory-sub">{cookie.description}</span>
                ) : null}
                {cookie.purpose ? (
                  <span className="website-cookies-inventory-sub">
                    Purpose: {cookie.purpose}
                  </span>
                ) : null}
                {cookie.sourceUrl ? (
                  <span className="website-cookies-inventory-sub">
                    Source: {cookie.sourceUrl}
                  </span>
                ) : null}
              </td>
              <td>{formatInventoryType(cookie.inventoryType)}</td>
              <td>
                {cookie.category
                  ? COOKIE_CATEGORY_LABELS[cookie.category] ?? cookie.category
                  : '—'}
              </td>
              <td className="website-cookies-inventory-provider">
                {cookie.provider ?? '—'}
                {cookie.providerDomain ? (
                  <span className="website-cookies-inventory-sub">{cookie.providerDomain}</span>
                ) : null}
              </td>
              <td>{cookie.duration ?? '—'}</td>
              <td>{cookie.isThirdParty ? 'Yes' : cookie.isThirdParty === false ? 'No' : '—'}</td>
              <td>{cookie.foundBeforeConsent ? 'Yes' : 'No'}</td>
              <td>{cookie.riskLevel ?? '—'}</td>
              <td>{cookie.reviewStatus}</td>
              <td className="data-table-num">{cookie.seenCount}</td>
              <td>{new Date(cookie.lastSeenAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
