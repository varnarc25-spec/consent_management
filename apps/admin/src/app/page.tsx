import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480, margin: '4rem auto' }}>
        <h1>Consent Management Platform</h1>
        <p style={{ color: 'var(--muted)' }}>
          Multi-tenant consent management for cookies, trackers, and privacy compliance.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Link className="btn" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-secondary" href="/register">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
