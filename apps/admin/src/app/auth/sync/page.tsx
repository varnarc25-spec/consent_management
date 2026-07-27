'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setStoredTokens } from '@/lib/api';

export default function AuthSyncPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function sync() {
      const result = await fetch('/api/cmp-auth/sync').then((r) => r.json());

      if (!result.ok || !result.data?.accessToken || !result.data?.refreshToken) {
        setError(result.error?.message ?? 'Failed to complete sign-in');
        return;
      }

      setStoredTokens({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      });

      router.replace(result.data.isNewUser ? '/onboarding' : '/dashboard');
    }

    sync();
  }, [router]);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: '4rem auto' }}>
        <h1>Signing you in</h1>
        {error ? <p className="error">{error}</p> : <p style={{ color: 'var(--muted)' }}>Please wait...</p>}
      </div>
    </div>
  );
}
