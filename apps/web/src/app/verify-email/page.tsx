'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    apiFetch<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }).then((result) => {
      if (result.ok) {
        setMessage(result.data?.message ?? 'Email verified');
      } else {
        setError(result.error?.message ?? 'Verification failed');
      }
    });
  }, [searchParams]);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: '4rem auto' }}>
        <h1>Verify email</h1>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        {!message && !error && (
          <>
            <p style={{ color: 'var(--muted)' }}>
              {email
                ? `A verification link was generated for ${email}.`
                : 'A verification link was generated for your account.'}
            </p>
            <p className="success" style={{ marginTop: '0.75rem' }}>
              Local development: SMTP is not configured, so no real email is sent. Open the API
              server terminal and look for a <code>[DEV EMAIL]</code> log line with your
              verification link, or sign in again after registering (new accounts are auto-verified
              in dev).
            </p>
          </>
        )}
        <p style={{ marginTop: '1rem' }}>
          <Link href="/auth/login">Go to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="container"><p>Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
