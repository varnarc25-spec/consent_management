'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrentUser } from '@cmp/types';
import { apiFetch } from '@/lib/api';
import { UserShell } from '@/components/user-shell';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
        window.location.assign('/auth/login');
        return;
      }

      const verificationRequired = authConfig.data?.emailVerificationEnabled ?? true;
      if (verificationRequired && !result.data.emailVerified) {
        router.replace('/verify-email');
        return;
      }

      setUser(result.data);
      setLoading(false);
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

  return <UserShell user={user}>{children}</UserShell>;
}
