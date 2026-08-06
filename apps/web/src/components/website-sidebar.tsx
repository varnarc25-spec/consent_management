'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WebsiteCookiesTrackers } from '@/components/website-cookies-trackers';

const NAV_ITEMS = [
  { slug: 'dashboard', label: 'Dashboard', path: '' },
  { slug: 'consent', label: 'Consent configuration', path: '/consent' },
  { slug: 'test-banner', label: 'Test banner', path: '/test-banner' },
  { slug: 'scans', label: 'View scans', path: '/scans' },
] as const;

export function WebsiteSidebar({
  domainId,
  hostname,
  domainKey,
  verificationStatus,
}: {
  domainId: string;
  hostname?: string;
  domainKey?: string;
  verificationStatus?: string;
}) {
  const pathname = usePathname();
  const base = `/websites/${domainId}`;

  function isActive(path: string) {
    const href = `${base}${path}`;
    if (path === '') {
      return pathname === base || pathname === `${base}/`;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="website-sidebar" aria-label="Website navigation">
      <div className="website-sidebar-header">
        <p className="website-sidebar-label">Website</p>
        <p className="website-sidebar-host">{hostname ?? '…'}</p>
        {domainKey && verificationStatus && (
          <p className="website-sidebar-meta">
            Key: <code>{domainKey}</code> · Verification: {verificationStatus}
          </p>
        )}
      </div>
      <div className="website-sidebar-cookies">
        <WebsiteCookiesTrackers domainId={domainId} embedded />
      </div>
      <nav className="website-sidebar-nav" aria-label="Website sections">
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
    </aside>
  );
}
