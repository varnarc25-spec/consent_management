'use client';

import { useSearchParams } from 'next/navigation';

export function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const message = searchParams.get('login_error');
  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        margin: '0 auto 1.5rem',
        maxWidth: 640,
        padding: '0.75rem 1rem',
        borderRadius: 8,
        border: '1px solid #fecaca',
        background: '#fef2f2',
        color: '#991b1b',
        fontSize: '0.875rem',
      }}
    >
      {message}
    </div>
  );
}
