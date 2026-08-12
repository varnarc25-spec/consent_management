'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useWebsiteScan } from '@/components/website-scan-context';
import {
  type CookieCategorySummary,
  sortCookieCategories,
} from '@/lib/cookie-categories';
import { apiFetch } from '@/lib/api';
import type { DomainCookieItem } from '@/components/website-cookies-inventory';

export function WebsiteCookiesTrackers({
  domainId,
  embedded = false,
  hideHeading = false,
}: {
  domainId: string;
  embedded?: boolean;
  hideHeading?: boolean;
}) {
  const websiteScan = useWebsiteScan();
  const [cookieSummary, setCookieSummary] = useState<CookieCategorySummary | null>(null);
  const [inventoryTotal, setInventoryTotal] = useState<number | null>(null);
  const [summaryError, setSummaryError] = useState('');

  function loadCookieSummary(silent = true) {
    return apiFetch<CookieCategorySummary>(`/domains/${domainId}/cookies/summary`, { silent }).then(
      (r) => {
        if (r.data) {
          setCookieSummary(r.data);
          setSummaryError('');
        } else if (r.error) {
          setSummaryError(r.error.message);
        }
      },
    );
  }

  function loadInventoryCount(silent = true) {
    return apiFetch<DomainCookieItem[]>(`/domains/${domainId}/cookies`, { silent }).then((r) => {
      if (r.data) {
        setInventoryTotal(r.data.length);
      }
    });
  }

  useEffect(() => {
    void loadCookieSummary(true);
    void loadInventoryCount(true);
  }, [domainId]);

  // Refresh cookie inventory once when a scan finishes (provider is the only /scans poller).
  useEffect(() => {
    if (!websiteScan?.scanEpoch) return;
    void Promise.all([loadCookieSummary(true), loadInventoryCount(true)]);
  }, [websiteScan?.scanEpoch, domainId]);

  const hasRunningScan = Boolean(websiteScan?.hasRunningScan);

  const sortedCategories = useMemo(
    () => (cookieSummary ? sortCookieCategories(cookieSummary.categories) : []),
    [cookieSummary],
  );

  const categoriesWithCounts = sortedCategories.filter((c) => c.count > 0);
  const displayTotal = cookieSummary?.total ?? inventoryTotal ?? 0;
  const cookieCount = cookieSummary?.cookies ?? null;
  const trackerCount = cookieSummary?.trackers ?? null;

  const inner = (
    <>
      <p className="domain-cookie-total domain-cookie-total-sidebar">
        {hasRunningScan
          ? 'Scan in progress…'
          : displayTotal === 0
            ? 'No inventory yet. Run a homepage scan.'
            : `${displayTotal} item${displayTotal === 1 ? '' : 's'} in inventory`}
      </p>
      {(cookieCount != null || trackerCount != null) && (
        <p className="muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
          {[
            cookieCount != null ? `${cookieCount} cookies` : null,
            trackerCount != null ? `${trackerCount} trackers` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      {summaryError && <p className="error">{summaryError}</p>}
      {categoriesWithCounts.length > 0 && (
        <ul className="domain-cookie-cat-list">
          {categoriesWithCounts.map((cat) => (
            <li key={cat.key}>
              <span>{cat.label}</span>
              <strong>{cat.count}</strong>
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: '0.75rem' }}>
        <Link href={`/websites/${domainId}/cookies`} className="btn-link">
          View cookies report
        </Link>
      </p>
    </>
  );

  if (embedded) {
    return (
      <div className="website-cookies-trackers-embedded">
        {!hideHeading && <h3>Cookies & trackers</h3>}
        {inner}
      </div>
    );
  }

  return (
    <section className="card">
      {!hideHeading && <h2>Cookies & trackers</h2>}
      {inner}
    </section>
  );
}
