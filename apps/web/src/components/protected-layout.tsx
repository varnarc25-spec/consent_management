'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrentUser } from '@cmp/types';
import { apiFetch, ensureApiSession } from '@/lib/api';
import { redirectToAuthLogin } from '@/lib/auth-login';
import { UserShell } from '@/components/user-shell';
import { LoadingScreen } from '@/components/loading-screen';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setError('');
      const profileRes = await fetch('/api/auth/profile', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!profileRes.ok) {
        redirectToAuthLogin();
        return;
      }

      const sessionOk = await ensureApiSession();
      if (!sessionOk) {
        setError('Could not connect to the API. Make sure pnpm dev:api is running on port 4000.');
        setLoading(false);
        return;
      }

      const [result, authConfig] = await Promise.all([
        apiFetch<CurrentUser>('/auth/me'),
        apiFetch<{ emailVerificationEnabled: boolean }>('/auth/config'),
      ]);

      if (!result.ok || !result.data) {
        setError(result.error?.message ?? 'Could not load your account. Try signing in again.');
        setLoading(false);
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

  if (loading && !error) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="card" style={{ margin: '2rem auto', maxWidth: 520 }}>
        <p className="error">{error}</p>
        <button
          className="btn btn-secondary"
          type="button"
          style={{ marginTop: '1rem' }}
          onClick={() => redirectToAuthLogin()}
        >
          Sign in again
        </button>
      </div>
    );
  }

  if (!user) {
    return <LoadingScreen />;
  }

  return <UserShell user={user}>{children}</UserShell>;
}
