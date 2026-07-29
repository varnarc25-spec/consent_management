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

  return (
    <>
      <header className="site-header">
        <Link href="/" style={{ color: 'var(--text)', textDecoration: 'none' }}>
          <strong>CMP</strong>
        </Link>
        <nav aria-label="Account navigation" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: pathname === item.href ? 'var(--primary)' : 'var(--muted)',
                textDecoration: 'none',
                fontWeight: pathname === item.href ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          ))}
          <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            {user.firstName} {user.lastName}
          </span>
          <button className="btn btn-secondary" onClick={handleLogout} type="button" style={{ padding: '0.4rem 0.75rem' }}>
            Sign out
          </button>
        </nav>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
