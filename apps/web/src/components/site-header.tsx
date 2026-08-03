import { AuthNavLink } from '@/components/auth-nav-link';
import { CmpLogo } from '@/components/cmp-logo';
import { SiteHeaderUserNav } from '@/components/site-header-user-nav';
import { isAuthUiEnabled } from '@cmp/auth';
import { getAdminUrl } from '@/lib/admin-url';

export function SiteHeader({
  signedIn,
}: {
  signedIn?: boolean;
}) {
  return (
    <header className="site-header">
      <CmpLogo label="CMP" />
      <nav aria-label="Site navigation" className="site-header-nav">
        <a href="#features">Features</a>
        <a href="#compliance">Compliance</a>
        {isAuthUiEnabled() ? (
          <SiteHeaderUserNav sessionSignedIn={Boolean(signedIn)} />
        ) : (
          <>
            <a href={`${getAdminUrl()}/auth/login`}>Sign in</a>
            <a className="btn" href={`${getAdminUrl()}/auth/login?screen_hint=signup`} style={{ padding: '0.5rem 1rem' }}>
              Get started
            </a>
          </>
        )}
      </nav>
    </header>
  );
}
