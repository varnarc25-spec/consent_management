'use client';

import Link from 'next/link';
import type { CurrentUser } from '@cmp/types';
import { clearStoredTokens } from '@/lib/api';

export function ProfileMenu({ user }: { user: CurrentUser }) {
  function handleLogout() {
    clearStoredTokens();
    window.location.assign('/auth/logout');
  }

  return (
    <div className="profile-menu">
      <button
        className="profile-menu-trigger"
        type="button"
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <span className="profile-menu-name">{user.firstName} {user.lastName}</span>
        <span className="profile-menu-chevron" aria-hidden>▾</span>
      </button>
      <div className="profile-menu-dropdown" role="menu">
        <div className="profile-menu-header">
          <strong>{user.firstName} {user.lastName}</strong>
          <span>{user.email}</span>
        </div>
        <Link className="profile-menu-item" href="/settings/organization" role="menuitem">
          Organization
        </Link>
        <Link className="profile-menu-item" href="/settings" role="menuitem">
          Security &amp; activity
        </Link>
        <button className="profile-menu-item profile-menu-logout" type="button" onClick={handleLogout} role="menuitem">
          Logout
        </button>
      </div>
    </div>
  );
}
