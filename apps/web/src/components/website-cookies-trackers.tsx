'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunningScanPoll } from '@/hooks/use-running-scan-poll';
import { useWebsiteScan } from '@/components/website-scan-context';
import {
  type CookieCategorySummary,
  sortCookieCategories,
} from '@/lib/cookie-categories';
import { apiFetch } from '@/lib/api';
import type { DomainCookieItem } from '@/components/website-cookies-inventory';

interface ScanSummary {
  status: string;
}

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
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [cookieSummary, setCookieSummary] = useState<CookieCategorySummary | null>(null);
  const [inventoryTotal, setInventoryTotal] = useState<number | null>(null);
  const [summaryError, setSummaryError] = useState('');

  function loadScans(silent = true) {
    return apiFetch<ScanSummary[]>(`/domains/${domainId}/scans`, { silent }).then((r) => {
      if (r.data) setScans(r.data);
      return r.data;
    });
  }

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
    loadScans(true);
    loadCookieSummary(true);
    loadInventoryCount(true);
  }, [domainId]);

  useEffect(() => {
    if (websiteScan?.hasRunningScan) {
      void loadScans(true);
    }
  }, [websiteScan?.hasRunningScan, domainId]);

  const hasRunningScan =
    scans.some((s) => s.status === 'RUNNING') || Boolean(websiteScan?.hasRunningScan);

  const refreshAfterScan = useCallback(async () => {
    await Promise.all([loadScans(true), loadCookieSummary(true), loadInventoryCount(true)]);
  }, [domainId]);

  useRunningScanPoll(
    hasRunningScan,
    async () => {
      await loadScans(true);
    },
    refreshAfterScan,
  );

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
        {displayTotal}
      </p>
      {cookieCount != null && trackerCount != null && displayTotal > 0 && (
        <p className="website-cookies-sidebar-split">
          {cookieCount} cookies · {trackerCount} trackers
        </p>
      )}
      {summaryError && (
        <p className="error" style={{ fontSize: '0.8125rem' }}>{summaryError}</p>
      )}
      {categoriesWithCounts.length > 0 ? (
        <ul className="domain-category-list">
          {categoriesWithCounts.map((c) => (
            <li key={c.slug}>
              <span>{c.label}</span>
              <span>{c.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={embedded ? 'website-section-muted' : 'website-sidebar-muted'}>
          {hasRunningScan
            ? 'Waiting for scan results…'
            : 'No inventory yet. Run a homepage scan.'}
        </p>
      )}
      <Link
        href={`/websites/${domainId}/cookies`}
        className="website-cookies-view-details"
      >
        View details
      </Link>
    </>
  );

  if (embedded) {
    return (
      <div className="website-cookies-embedded">
        {!hideHeading && (
          <h2 className="website-sidebar-section-title">Cookies &amp; trackers</h2>
        )}
        <div className="domain-panel website-sidebar-panel">{inner}</div>
      </div>
    );
  }

  return (
    <section className="website-sidebar-section">
      <h2 className="website-sidebar-section-title">Cookies &amp; trackers</h2>
      <div className="domain-panel website-sidebar-panel">{inner}</div>
    </section>
  );
}
