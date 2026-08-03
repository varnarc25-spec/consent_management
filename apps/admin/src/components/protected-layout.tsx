'use client';

import { useEffect, useState } from 'react';
import type { CurrentUser } from '@cmp/types';
import { apiFetch } from '@/lib/api';
import { getWebUrl } from '@/lib/web-url';
import { AdminShell } from '@/components/admin-shell';
import { LoadingScreen } from '@/components/loading-screen';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });

      const [result, authConfig] = await Promise.all([
        apiFetch<CurrentUser>('/auth/me'),
        apiFetch<{ emailVerificationEnabled: boolean }>('/auth/config'),
      ]);

      if (!result.ok || !result.data) {
        window.location.href = '/auth/login';
        return;
      }

      const webUrl = getWebUrl();
      const verificationRequired = authConfig.data?.emailVerificationEnabled ?? true;
      if (verificationRequired && !result.data.emailVerified) {
        window.location.assign(`${webUrl}/verify-email`);
        return;
      }

      setUser(result.data);
      setLoading(false);
    }

    load();
  }, []);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
