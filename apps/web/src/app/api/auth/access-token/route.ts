import { cookies } from 'next/headers';
import { getAuth0 } from '@/lib/auth0';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth-cookies';
import {
  isAccessTokenExpired,
  refreshCmpTokensFromCookie,
  setCmpTokenCookies,
} from '@/lib/cmp-auth-server';
import { NextResponse } from 'next/server';

export async function GET() {
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

  try {
    const audience = process.env.AUTH0_AUDIENCE;
    const result = await getAuth0().getAccessToken(audience ? { audience } : undefined);
    if (result?.token) {
      return NextResponse.json({ accessToken: result.token });
    }
  } catch {
    // Fall through to 401
  }

  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
