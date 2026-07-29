import { getAuth0 } from '@/lib/auth0';
import { getApiBaseUrl } from '@/lib/runtime-public-env';
import { NextResponse } from 'next/server';
import type { SessionData } from '@auth0/nextjs-auth0/types';

const ACCESS_COOKIE = 'cmp_access_token';
const REFRESH_COOKIE = 'cmp_refresh_token';

function setCmpTokenCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function POST() {
  const session = await getAuth0().getSession();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'No session' }, { status: 401 });
  }

  const idToken = (session as SessionData).tokenSet?.idToken;
  if (!idToken) {
    return NextResponse.json({ ok: false, error: 'No id token' }, { status: 401 });
  }

  const apiUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/auth/auth0/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'NETWORK_ERROR', message: 'API unreachable' } },
      { status: 502 },
    );
  }

  const result = (await res.json()) as {
    ok: boolean;
    data?: { accessToken: string; refreshToken: string };
    error?: { message?: string };
  };

  const response = NextResponse.json(result, { status: result.ok ? 200 : 401 });
  if (result.ok && result.data?.accessToken && result.data?.refreshToken) {
    setCmpTokenCookies(response, result.data);
  }
  return response;
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
