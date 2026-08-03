'use client';

import { useEffect, useState } from 'react';
import type { CurrentUser } from '@cmp/types';
import { AuthNavLink } from '@/components/auth-nav-link';
import { ProfileMenu } from '@/components/profile-menu';
import { apiFetch, ensureApiSession } from '@/lib/api';

export function SiteHeaderUserNav({ sessionSignedIn }: { sessionSignedIn: boolean }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function load() {
      if (!sessionSignedIn) {
        setChecked(true);
        return;
      }
      await ensureApiSession();
      const result = await apiFetch<CurrentUser>('/auth/me');
      if (result.data) {
        setUser(result.data);
      }
      setChecked(true);
    }
    load();
  }, [sessionSignedIn]);

  if (!sessionSignedIn) {
    return (
      <>
        <AuthNavLink href="/auth/login">Sign in</AuthNavLink>
        <AuthNavLink className="btn" href="/auth/login?screen_hint=signup" style={{ padding: '0.5rem 1rem' }}>
          Get started
        </AuthNavLink>
      </>
    );
  }

  if (!checked) {
    return null;
  }

  return (
    <>
      {user ? <ProfileMenu user={user} /> : null}
      <AuthNavLink className="btn" href="/dashboard" style={{ padding: '0.5rem 1rem' }}>
        Dashboard
      </AuthNavLink>
    </>
  );
}
