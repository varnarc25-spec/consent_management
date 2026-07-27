'use client';

import Link from 'next/link';

const auth0Enabled = Boolean(process.env.NEXT_PUBLIC_AUTH0_DOMAIN);

export default function RegisterPage() {
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: '4rem auto' }}>
        <h1>Create account</h1>
        {auth0Enabled ? (
          <>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Sign up securely with Auth0. You can use email, Google, or other connections
              configured in your Auth0 tenant.
            </p>
            <a className="btn" href="/auth/login?screen_hint=signup" style={{ display: 'block', textAlign: 'center' }}>
              Continue with Auth0
            </a>
          </>
        ) : (
          <p className="error">
            Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and
            AUTH0_SECRET in your environment.
          </p>
        )}
        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          <Link href="/login">Already have an account?</Link>
        </p>
      </div>
    </div>
  );
}
