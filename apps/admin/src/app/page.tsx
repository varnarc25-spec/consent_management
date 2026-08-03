import { redirect } from 'next/navigation';
import { isAuth0Configured } from '@cmp/auth';

export default function HomePage() {
  if (isAuth0Configured()) {
    redirect('/dashboard');
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 480, margin: '4rem auto' }}>
        <h1>Consent Management Platform</h1>
        <p style={{ color: 'var(--muted)' }}>
          Configure Auth0 to access the admin dashboard.
        </p>
      </div>
    </div>
  );
}
