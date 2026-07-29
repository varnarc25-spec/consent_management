import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth-cookies';
import { getApiBaseUrl } from '@/lib/runtime-public-env';

export function setCmpTokenCookies(
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

export function isAccessTokenExpired(token: string, leewaySeconds = 30): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'),
    ) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp <= Math.floor(Date.now() / 1000) + leewaySeconds;
  } catch {
    return true;
  }
}

export async function refreshCmpTokensFromCookie(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const apiUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    const result = (await res.json()) as {
      ok: boolean;
      data?: { accessToken: string; refreshToken: string };
    };
    if (!result.ok || !result.data?.accessToken || !result.data?.refreshToken) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}
