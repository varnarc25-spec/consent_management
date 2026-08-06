'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CurrentUser } from '@cmp/types';
import { CmpLogo } from '@/components/cmp-logo';
import { ProfileMenu } from '@/components/profile-menu';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
];

export function UserShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isNavActive(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/websites');
    }
    if (href === '/settings') {
      return pathname.startsWith('/settings');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="portal-layout">
      <header className="nav" role="banner">
        <CmpLogo label="CMP Portal" />
        <nav aria-label="Main navigation" className="nav-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isNavActive(item.href) ? 'page' : undefined}
              className={isNavActive(item.href) ? 'active' : undefined}
            >
              {item.label}
            </Link>
          ))}
          {pathname.startsWith('/websites/') && (
            <Link href="/dashboard" className="nav-back-link">
              ← All websites
            </Link>
          )}
        </nav>
        <div className="nav-actions">
          <ProfileMenu user={user} />
        </div>
      </header>
      <main className="container portal-main">{children}</main>
    </div>
  );
}
