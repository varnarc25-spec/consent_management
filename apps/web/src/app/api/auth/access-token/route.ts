import { cookies } from 'next/headers';
import { getAuth0 } from '@/lib/auth0';
import { getAuth0SessionFromRequest } from '@/lib/auth0-session.server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth-cookies';
import {
  isAccessTokenExpired,
  refreshCmpTokensFromCookie,
  setCmpTokenCookies,
} from '@/lib/cmp-auth-server';
import { getApiBaseUrl } from '@/lib/runtime-public-env';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const cmpToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (cmpToken && !isAccessTokenExpired(cmpToken)) {
    return NextResponse.json({ accessToken: cmpToken });
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    const refreshed = await refreshCmpTokensFromCookie(refreshToken);
    if (refreshed) {
      const response = NextResponse.json({ accessToken: refreshed.accessToken });
      setCmpTokenCookies(response, refreshed);
      return response;
    }
  }

  const audience = process.env.AUTH0_AUDIENCE;

  try {
    const session = await getAuth0SessionFromRequest(request);
    if (session?.user) {
      const idToken =
        (session as { tokenSet?: { idToken?: string; id_token?: string } }).tokenSet?.idToken ??
        (session as { tokenSet?: { id_token?: string } }).tokenSet?.id_token;
      if (idToken) {
        const res = await fetch(`${getApiBaseUrl()}/auth/auth0/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          cache: 'no-store',
        });
        const result = (await res.json()) as {
          ok: boolean;
          data?: { accessToken: string; refreshToken: string };
        };
        if (result.ok && result.data?.accessToken && result.data?.refreshToken) {
          const response = NextResponse.json({ accessToken: result.data.accessToken });
          setCmpTokenCookies(response, result.data);
          return response;
        }
      }
    }

    const result = await getAuth0().getAccessToken(audience ? { audience } : undefined);
    if (result?.token) {
      return NextResponse.json({ accessToken: result.token });
    }
  } catch {
    // Fall through to 401
  }

  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
