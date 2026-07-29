import { cookies } from 'next/headers';
import { getAuth0 } from '@/lib/auth0';
import { ACCESS_COOKIE } from '@/lib/auth-cookies';
import { getApiBaseUrl } from '@/lib/runtime-public-env';
import type { ApiResult } from '@cmp/utils';

export async function getApiAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cmpToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (cmpToken) return cmpToken;

  try {
    const audience = process.env.AUTH0_AUDIENCE;
    const result = await getAuth0().getAccessToken(audience ? { audience } : undefined);
    return result?.token ?? null;
  } catch (error) {
    console.error('[auth] getAccessToken failed', error);
    return null;
  }
}

export async function apiServerFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const token = await getApiAccessToken();
  const apiUrl = getApiBaseUrl();

  if (!token) {
    return {
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
    };
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'API server unreachable';
    return { ok: false, error: { code: 'NETWORK_ERROR', message } };
  }

  return res.json() as Promise<ApiResult<T>>;
}
