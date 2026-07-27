'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@cmp/auth';
import type { CurrentUser } from '@cmp/types';
import { apiFetch, clearStoredTokens, getStoredTokens } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', permission: null },
  { href: '/domains', label: 'Domains', permission: PERMISSIONS.DOMAIN_MANAGE },
  { href: '/organization', label: 'Organization', permission: PERMISSIONS.ORGANIZATION_MANAGE },
  { href: '/users', label: 'Users', permission: PERMISSIONS.USER_MANAGE },
  { href: '/audit-logs', label: 'Audit Logs', permission: PERMISSIONS.AUDIT_VIEW },
  { href: '/settings', label: 'Settings', permission: null },
];

export function AdminShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const tokens = getStoredTokens();
    if (tokens?.refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
    }
    clearStoredTokens();
    if (process.env.NEXT_PUBLIC_AUTH0_DOMAIN) {
      window.location.href = '/auth/logout';
      return;
    }
    router.push('/login');
  }

  return (
    <>
      <header className="nav" role="banner">
        <strong>CMP Admin</strong>
        <nav aria-label="Main navigation" style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          {NAV_ITEMS.filter(
            (item) => !item.permission || hasPermission(user.permissions, item.permission),
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={pathname === item.href ? 'active' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          {user.firstName} {user.lastName}
        </span>
        <button className="btn btn-secondary" onClick={handleLogout} type="button">
          Logout
        </button>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
