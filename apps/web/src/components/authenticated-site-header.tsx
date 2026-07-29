import { isAuth0Configured } from '@cmp/auth';
import { getAuth0 } from '@/lib/auth0';
import { SiteHeader } from '@/components/site-header';

export async function AuthenticatedSiteHeader() {
  let signedIn = false;
  let userName: string | undefined;

  if (isAuth0Configured()) {
    try {
      const session = await getAuth0().getSession();
      if (session?.user) {
        signedIn = true;
        const user = session.user as { name?: string; email?: string; nickname?: string };
        userName = user.name || user.nickname || user.email;
      }
    } catch {
      // Session unavailable — show logged-out header.
    }
  }

  return <SiteHeader signedIn={signedIn} userName={userName} />;
}
