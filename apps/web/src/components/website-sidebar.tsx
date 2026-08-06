'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { slug: 'dashboard', label: 'Dashboard', path: '' },
  { slug: 'consent', label: 'Consent configuration', path: '/consent' },
  { slug: 'test-banner', label: 'Test banner', path: '/test-banner' },
] as const;

export function WebsiteSidebar({
  domainId,
  hostname,
}: {
  domainId: string;
  hostname?: string;
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
      </div>
      <nav className="website-sidebar-nav">
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
      <Link href="/dashboard" className="website-sidebar-back">← All websites</Link>
    </aside>
  );
}
