'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, setStoredTokens } from '@/lib/api';

const auth0Enabled = Boolean(process.env.NEXT_PUBLIC_AUTH0_DOMAIN);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === '1';
  const emailParam = searchParams.get('email') ?? '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData(e.currentTarget);
    const result = await apiFetch<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    });

    setLoading(false);

    if (!result.ok || !result.data) {
      if (result.error?.code === 'EMAIL_NOT_VERIFIED') {
        const email = String(form.get('email') ?? '');
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      if (result.error?.code === 'USE_AUTH0') {
        setError('This account uses Auth0. Please sign in with Auth0 below.');
        return;
      }
      setError(result.error?.message ?? 'Login failed');
      return;
    }

    setStoredTokens(result.data);
    router.push('/dashboard');
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '4rem auto' }}>
      <h1>Sign in</h1>
      {registered && (
        <p className="success">Account created. Verify your email, then sign in below.</p>
      )}

      {auth0Enabled && (
        <>
          <a className="btn" href="/auth/login" style={{ display: 'block', textAlign: 'center', marginBottom: '1rem' }}>
            Continue with Auth0
          </a>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem' }}>
            or sign in with email
          </p>
        </>
      )}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={emailParam}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in with email'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
        <Link href="/forgot-password">Forgot password?</Link>
        {auth0Enabled ? (
          <>
            {' '}
            · <Link href="/register">Create account</Link>
          </>
        ) : (
          <>
            {' '}
            · <Link href="/register">Register</Link>
          </>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container">
      <Suspense fallback={<div className="card" style={{ maxWidth: 420, margin: '4rem auto' }}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
