'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrentUser } from '@cmp/types';
import { apiFetch, clearStoredTokens, getStoredTokens } from '@/lib/api';
import { AdminShell } from '@/components/admin-shell';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const tokens = getStoredTokens();
      if (!tokens) {
        router.replace('/login');
        return;
      }

      const [result, authConfig] = await Promise.all([
        apiFetch<CurrentUser>('/auth/me'),
        apiFetch<{ emailVerificationEnabled: boolean }>('/auth/config'),
      ]);

      if (!result.ok || !result.data) {
        clearStoredTokens();
        router.replace('/login');
        return;
      }

      const verificationRequired = authConfig.data?.emailVerificationEnabled ?? true;
      if (verificationRequired && !result.data.emailVerified) {
        router.replace('/verify-email');
        return;
      }

      setUser(result.data);
      setLoading(false);

      const path = window.location.pathname;
      if (!result.data.organizationId && !path.startsWith('/onboarding')) {
        router.replace('/onboarding');
        return;
      }

      if (
        result.data.organizationId &&
        !path.startsWith('/onboarding') &&
        !path.startsWith('/domains')
      ) {
        const onboarding = await apiFetch<{
          complete: boolean;
          step: number;
        }>('/organizations/me/onboarding');
        if (onboarding.data && !onboarding.data.complete && onboarding.data.step < 10) {
          router.replace('/onboarding');
          return;
        }
      }
    }

    load();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="container">
        <p role="status">Loading...</p>
      </div>
    );
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
