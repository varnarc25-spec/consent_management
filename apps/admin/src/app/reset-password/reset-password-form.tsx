'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = await apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password: form.get('password') }),
    });
    if (result.ok) {
      setMessage(result.data?.message ?? 'Password reset');
    } else {
      setError(result.error?.message ?? 'Reset failed');
    }
  }

  return (
    <div className="container">
      <form className="card" style={{ maxWidth: 420, margin: '4rem auto' }} onSubmit={onSubmit}>
        <h1>Set new password</h1>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" required />
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={!token}>
          Reset password
        </button>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
