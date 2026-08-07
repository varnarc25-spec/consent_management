'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { COOKIE_CATEGORY_LABELS } from '@/lib/cookie-categories';
import type { DomainCookieItem } from '@/components/website-cookies-inventory';
import { WebsiteCookiesRowDetail } from '@/components/website-cookies-row-detail';
import { isCookieInventoryType, isTrackerInventoryType } from '@/lib/inventory-types';

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

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function isUnclassified(cookie: DomainCookieItem) {
  return !cookie.category || cookie.category === 'unclassified';
}

function getCategoryLabel(cookie: DomainCookieItem) {
  if (!cookie.category) return 'Unclassified';
  return COOKIE_CATEGORY_LABELS[cookie.category] ?? cookie.category;
}

function getProviderLabel(cookie: DomainCookieItem) {
  return cookie.providerDomain ?? cookie.cookieDomain ?? cookie.provider ?? '—';
}

function getTypeLabel(cookie: DomainCookieItem) {
  return INVENTORY_TYPE_LABELS[cookie.inventoryType] ?? cookie.inventoryType;
}

export function WebsiteCookiesReport({
  domainId,
  hostname,
  cookies,
  loading = false,
  onCookieUpdated,
}: {
  domainId: string;
  hostname: string;
  cookies: DomainCookieItem[];
  loading?: boolean;
  onCookieUpdated?: (cookie: DomainCookieItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<'trackers' | 'reports' | 'recipients'>('trackers');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cookies' | 'trackers'>('all');
  const [search, setSearch] = useState('');
  const [unclassifiedOnly, setUnclassifiedOnly] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const classifiedCount = cookies.filter((c) => !isUnclassified(c)).length;
  const priorConsentCount = cookies.filter((c) => c.foundBeforeConsent).length;
  const cookieItems = cookies.filter((c) => isCookieInventoryType(c.inventoryType));
  const trackerItems = cookies.filter((c) => isTrackerInventoryType(c.inventoryType));
  const classificationPct =
    cookies.length > 0 ? Math.round((classifiedCount / cookies.length) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cookies.filter((cookie) => {
      if (typeFilter === 'cookies' && !isCookieInventoryType(cookie.inventoryType)) return false;
      if (typeFilter === 'trackers' && !isTrackerInventoryType(cookie.inventoryType)) return false;
      if (unclassifiedOnly && !isUnclassified(cookie)) return false;
      if (!q) return true;
      const haystack = [
        cookie.cookieName,
        cookie.inventoryType,
        getTypeLabel(cookie),
        cookie.provider,
        cookie.providerDomain,
        cookie.cookieDomain,
        cookie.category,
        cookie.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [cookies, search, unclassifiedOnly, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div className="cookies-report">
      <h1 className="cookies-report-page-title">Cookies &amp; Reports</h1>

      <div className="cookies-report-tabs" role="tablist" aria-label="Cookies and reports">
        <button
          type="button"
          role="tab"
          className={activeTab === 'trackers' ? 'active' : undefined}
          aria-selected={activeTab === 'trackers'}
          onClick={() => setActiveTab('trackers')}
        >
          Cookies and Trackers
        </button>
        <button
          type="button"
          role="tab"
          className={activeTab === 'reports' ? 'active' : undefined}
          aria-selected={activeTab === 'reports'}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          type="button"
          role="tab"
          className={activeTab === 'recipients' ? 'active' : undefined}
          aria-selected={activeTab === 'recipients'}
          onClick={() => setActiveTab('recipients')}
        >
          Scan report recipients
        </button>
      </div>

      {activeTab === 'trackers' ? (
        <div className="cookies-report-card">
          <div className="cookies-report-card-header">
            <div>
              <h2>Cookies and Trackers</h2>
              <p className="cookies-report-card-desc">
                Unique cookies and trackers from your latest scan inventory.
                {cookies.length > 0 ? (
                  <>
                    {' '}
                    <strong>{cookieItems.length}</strong> cookies ·{' '}
                    <strong>{trackerItems.length}</strong> trackers ·{' '}
                    <strong>{cookies.length}</strong> total unique
                  </>
                ) : null}
              </p>
            </div>
            <Link
              href={`/websites/${domainId}`}
              className="cookies-report-domain-btn"
              title="Website settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              {hostname}
            </Link>
          </div>

          <div className="cookies-report-progress">
            <div className="cookies-report-progress-label">
              <span>Classification progress</span>
              <strong>{classificationPct}%</strong>
            </div>
            <div className="cookies-report-progress-track">
              <div
                className="cookies-report-progress-fill"
                style={{ width: `${classificationPct}%` }}
              />
            </div>
            <div className="cookies-report-progress-meta">
              <span>
                {classifiedCount} of {cookies.length} classified
              </span>
              {priorConsentCount > 0 && (
                <span className="cookies-report-prior-warning">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {priorConsentCount} firing prior to consent
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <p className="website-section-muted">Loading inventory…</p>
          ) : cookies.length === 0 ? (
            <p className="website-section-muted">
              No cookies or trackers yet. Run a homepage scan from Website settings.
            </p>
          ) : (
            <>
              <div className="cookies-report-type-filters" role="tablist" aria-label="Inventory type">
                <button
                  type="button"
                  className={typeFilter === 'all' ? 'active' : undefined}
                  onClick={() => {
                    setTypeFilter('all');
                    setPage(0);
                  }}
                >
                  All ({cookies.length})
                </button>
                <button
                  type="button"
                  className={typeFilter === 'cookies' ? 'active' : undefined}
                  onClick={() => {
                    setTypeFilter('cookies');
                    setPage(0);
                  }}
                >
                  Cookies ({cookieItems.length})
                </button>
                <button
                  type="button"
                  className={typeFilter === 'trackers' ? 'active' : undefined}
                  onClick={() => {
                    setTypeFilter('trackers');
                    setPage(0);
                  }}
                >
                  Trackers ({trackerItems.length})
                </button>
              </div>

              <div className="cookies-report-table-wrap">
                <table className="cookies-report-table">
                  <thead>
                    <tr>
                      <th>Tracker name</th>
                      <th>Type</th>
                      <th>Provider</th>
                      <th>Category</th>
                      <th>Prior consent</th>
                      <th className="cookies-report-action-col" aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((cookie) => {
                      const unclassified = isUnclassified(cookie);
                      const expanded = expandedId === cookie.id;
                      return (
                        <Fragment key={cookie.id}>
                          <tr
                            className={`cookies-report-row${expanded ? ' expanded' : ''}`}
                            role="button"
                            tabIndex={0}
                            aria-expanded={expanded}
                            aria-label={`${cookie.cookieName}, ${getTypeLabel(cookie)}`}
                            onClick={() => toggleExpanded(cookie.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleExpanded(cookie.id);
                              }
                            }}
                          >
                            <td className="cookies-report-name">
                              <span className="cookies-report-name-text" title={cookie.cookieName}>
                                {cookie.cookieName}
                              </span>
                            </td>
                            <td className="cookies-report-type">{getTypeLabel(cookie)}</td>
                            <td className="cookies-report-provider">{getProviderLabel(cookie)}</td>
                            <td>
                              <span
                                className={
                                  unclassified ? 'cookies-report-category-unclassified' : undefined
                                }
                              >
                                {getCategoryLabel(cookie)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  cookie.foundBeforeConsent
                                    ? 'cookies-report-consent-badge cookies-report-consent-not-blocked'
                                    : 'cookies-report-consent-badge cookies-report-consent-blocked'
                                }
                              >
                                {cookie.foundBeforeConsent ? 'Not blocked' : 'Blocked'}
                              </span>
                            </td>
                            <td className="cookies-report-action-col">
                              <span className="cookies-report-row-chevron" aria-hidden="true">
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className={expanded ? 'rotated' : undefined}
                                >
                                  <path
                                    d="M9 6l6 6-6 6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="cookies-report-detail-row">
                              <td colSpan={6}>
                                <WebsiteCookiesRowDetail
                                  domainId={domainId}
                                  cookie={cookie}
                                  onUpdated={(updated) => onCookieUpdated?.(updated)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="cookies-report-footer">
                <div className="cookies-report-search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search for tracker"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    aria-label="Search for tracker"
                  />
                </div>

                <div className="cookies-report-footer-controls">
                  <label className="cookies-report-page-size">
                    <span>Rows per page</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(0);
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>

                  <label className="cookies-report-filter-check">
                    <input
                      type="checkbox"
                      checked={unclassifiedOnly}
                      onChange={(e) => {
                        setUnclassifiedOnly(e.target.checked);
                        setPage(0);
                      }}
                    />
                    Unclassified only
                  </label>

                  <div className="cookies-report-pagination">
                    <button
                      type="button"
                      disabled={safePage === 0}
                      onClick={() => setPage(0)}
                      aria-label="First page"
                    >
                      «
                    </button>
                    <button
                      type="button"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setPage(totalPages - 1)}
                      aria-label="Last page"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="cookies-report-card cookies-report-placeholder">
          <p className="website-section-muted">
            {activeTab === 'reports'
              ? 'Scheduled scan reports will appear here.'
              : 'Configure email recipients for scan reports here.'}
          </p>
        </div>
      )}
    </div>
  );
}
