import { AuthNavLink } from '@/components/auth-nav-link';
import { isAuthUiEnabled } from '@cmp/auth';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';

export function SiteHeader({
  signedIn,
  userName,
}: {
  signedIn?: boolean;
  userName?: string;
}) {
  return (
    <header className="site-header">
      <strong>CMP</strong>
      <nav aria-label="Site navigation">
        <a href="#features">Features</a>
        <a href="#compliance">Compliance</a>
        {isAuthUiEnabled() ? (
          signedIn ? (
            <>
              {userName ? (
                <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{userName}</span>
              ) : null}
              <AuthNavLink href="/auth/logout">Sign out</AuthNavLink>
              <AuthNavLink className="btn" href={`${ADMIN_URL}/dashboard`} style={{ padding: '0.5rem 1rem' }}>
                Dashboard
              </AuthNavLink>
            </>
          ) : (
            <>
              <AuthNavLink href="/auth/login">Sign in</AuthNavLink>
              <AuthNavLink className="btn" href="/auth/login?screen_hint=signup" style={{ padding: '0.5rem 1rem' }}>
                Get started
              </AuthNavLink>
            </>
          )
        ) : (
          <>
            <a href={`${ADMIN_URL}/auth/login`}>Sign in</a>
            <a className="btn" href={`${ADMIN_URL}/auth/login?screen_hint=signup`} style={{ padding: '0.5rem 1rem' }}>
              Get started
            </a>
          </>
        )}
      </nav>
    </header>
  );
}

export { ADMIN_URL };
