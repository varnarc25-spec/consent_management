import { isAuth0Configured } from '@cmp/auth';
import { serializeAuth0User } from '@/lib/auth0-user';
import { getAuth0SessionFromHeaders } from '@/lib/auth0-session.server';
import { SiteHeader } from '@/components/site-header';

export async function AuthenticatedSiteHeader() {
  let signedIn = false;
  let authUser = null;

  if (isAuth0Configured()) {
    try {
      const session = await getAuth0SessionFromHeaders();
      if (session?.user) {
        signedIn = true;
        authUser = serializeAuth0User(session.user as Record<string, unknown>);
      }
    } catch {
      // Session unavailable — show logged-out header.
    }
  }

  return <SiteHeader signedIn={signedIn} authUser={authUser} />;
}
