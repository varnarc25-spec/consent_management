'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CurrentUser } from '@cmp/types';
import { clearStoredTokens } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings', label: 'Settings' },
];

export function UserShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function handleLogout() {
    clearStoredTokens();
    window.location.assign('/auth/logout');
  }

  function isNavActive(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/websites');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="portal-layout">
      <header className="nav" role="banner">
        <strong>CMP Portal</strong>
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
        </nav>
        <div className="nav-actions">
          <span className="nav-user">
            {user.firstName} {user.lastName}
          </span>
          <button className="btn btn-secondary" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>
      <main className="container portal-main">{children}</main>
    </div>
  );
}
