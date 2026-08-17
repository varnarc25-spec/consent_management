'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CmpLogo } from '@/components/cmp-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { apiFetch } from '@/lib/api';
import type { CurrentUser } from '@cmp/types';

const NAV_ITEMS = [
  { slug: 'dashboard', label: 'Dashboard', path: '' },
  { slug: 'cookie-banner', label: 'Cookie Banner', path: '/consent' },
  { slug: 'cookie-manager', label: 'Cookie Manager', path: '/cookies' },
  { slug: 'consent-log', label: 'Consent Log', path: '/consent-log' },
  { slug: 'languages', label: 'Languages', path: '/languages' },
  { slug: 'advanced', label: 'Advanced Settings', path: '/advanced' },
  { slug: 'policies', label: 'Legal Policies', path: '/policies' },
  { slug: 'reports', label: 'Reports', path: '/reports' },
] as const;

interface DomainOption {
  id: string;
  hostname: string;
}

export function WebsiteChrome({
  domainId,
  hostname,
  children,
}: {
  domainId: string;
  hostname?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/websites/${domainId}`;
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [consentCount, setConsentCount] = useState(0);

  useEffect(() => {
    apiFetch<DomainOption[]>('/domains', { silent: true }).then((r) => {
      if (r.data) setDomains(r.data);
    });
    apiFetch<CurrentUser>('/auth/me', { silent: true }).then((r) => {
      if (r.data) setUser(r.data);
    });
    const from = new Date();
    from.setDate(from.getDate() - 30);
    apiFetch<{ totalInteractions: number }>(
      `/insights/analytics/consent?domainId=${encodeURIComponent(domainId)}&from=${encodeURIComponent(from.toISOString())}`,
      { silent: true },
    ).then((r) => {
      if (r.data) setConsentCount(r.data.totalInteractions ?? 0);
    });
  }, [domainId]);

  const displayHost = hostname || domains.find((d) => d.id === domainId)?.hostname || '…';

  function isActive(path: string) {
    const href = `${base}${path}`;
    if (path === '') {
      return pathname === base || pathname === `${base}/`;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const pageviewsUsed = consentCount;
  const pageviewsLimit = 300_000;
  const pageviewsPct = Math.min(100, Math.round((pageviewsUsed / pageviewsLimit) * 100));

  const selectedValue = useMemo(() => domainId, [domainId]);

  return (
    <div className="cy-shell">
      <header className="cy-topbar">
        <div className="cy-topbar-left">
          <Link href="/dashboard" className="cy-logo-link" aria-label="CMP home">
            <CmpLogo label="CMP" className="cy-logo" />
          </Link>
          <label className="cy-site-select-wrap">
            <span className="sr-only">Website</span>
            <select
              className="cy-site-select"
              value={selectedValue}
              onChange={(e) => {
                const next = e.target.value;
                if (next && next !== domainId) router.push(`/websites/${next}`);
              }}
            >
              {domains.length === 0 ? (
                <option value={domainId}>https://{displayHost}</option>
              ) : (
                domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    https://{d.hostname}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
        <div className="cy-topbar-right">
          <Link href="/dashboard" className="cy-top-link cy-top-link-accent">
            All websites
          </Link>
          <a
            className="cy-top-link"
            href="https://varnarc.com"
            target="_blank"
            rel="noreferrer"
          >
            Get Support
          </a>
          {user ? <ProfileMenu user={user} /> : null}
        </div>
      </header>

      <div className="cy-subnav">
        <nav className="cy-subnav-links" aria-label="Website sections">
          {NAV_ITEMS.map((item) => {
            const href = `${base}${item.path}`;
            const active = isActive(item.path);
            return (
              <Link
                key={item.slug}
                href={href}
                className={active ? 'active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="cy-subnav-meta">
          <span>
            Current plan: <strong>Pro</strong>
          </span>
          <span className="cy-pageviews">
            Pageviews used:{' '}
            <strong>
              {pageviewsUsed.toLocaleString()}/{pageviewsLimit.toLocaleString()} ({pageviewsPct}%)
            </strong>
          </span>
          <Link href="/settings/organization" className="cy-upgrade-btn">
            Upgrade
          </Link>
        </div>
      </div>

      <main className="cy-main">{children}</main>
    </div>
  );
}
