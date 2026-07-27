'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email') }),
    });
    setLoading(false);
    setMessage(result.data?.message ?? 'If the email exists, a reset link has been sent');
  }

  return (
    <div className="container">
      <form className="card" style={{ maxWidth: 420, margin: '4rem auto' }} onSubmit={onSubmit}>
        <h1>Reset password</h1>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        {message && <p className="success">{message}</p>}
        <button className="btn" type="submit" disabled={loading}>
          Send reset link
        </button>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
