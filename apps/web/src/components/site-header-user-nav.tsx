'use client';

import { useEffect, useState } from 'react';
import type { CurrentUser } from '@cmp/types';
import { AuthNavLink } from '@/components/auth-nav-link';
import { ProfileMenu } from '@/components/profile-menu';
import { apiFetch, ensureApiSession } from '@/lib/api';
import {
  displayNameFromAuth0User,
  type Auth0UserSummary,
} from '@/lib/auth0-user';

function authUserToFallbackProfile(authUser: Auth0UserSummary): CurrentUser {
  const name = authUser.name?.trim() ?? '';
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    id: authUser.sub ?? 'auth0-session',
    email: authUser.email ?? '',
    firstName: authUser.given_name ?? parts[0] ?? displayNameFromAuth0User(authUser),
    lastName: authUser.family_name ?? (parts.length > 1 ? parts.slice(1).join(' ') : ''),
    emailVerified: true,
    organizationId: null,
    roles: [],
    permissions: [],
  };
}

export function SiteHeaderUserNav({
  sessionSignedIn,
  authUser: authUserProp,
}: {
  sessionSignedIn: boolean;
  authUser?: Auth0UserSummary | null;
}) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authUser, setAuthUser] = useState<Auth0UserSummary | null>(authUserProp ?? null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function load() {
      if (!sessionSignedIn) {
        setChecked(true);
        return;
      }

      if (authUserProp) {
        setAuthUser(authUserProp);
      }

      await ensureApiSession();
      const result = await apiFetch<CurrentUser>('/auth/me');
      if (result.data) {
        setUser(result.data);
      }

      if (!authUserProp) {
        const sessionRes = await fetch('/api/auth/profile', { credentials: 'include', cache: 'no-store' });
        if (sessionRes.ok) {
          const json = (await sessionRes.json()) as { user?: Auth0UserSummary | null };
          if (json.user) setAuthUser(json.user);
        }
      }

      setChecked(true);
    }
    load();
  }, [sessionSignedIn, authUserProp]);

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

  const profileUser = user ?? (authUser ? authUserToFallbackProfile(authUser) : null);

  return (
    <>
      {profileUser ? <ProfileMenu user={profileUser} /> : null}
      <AuthNavLink className="btn" href="/dashboard" style={{ padding: '0.5rem 1rem' }}>
        Dashboard
      </AuthNavLink>
    </>
  );
}
