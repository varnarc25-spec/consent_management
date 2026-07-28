import { getAuth0 } from '@/lib/auth0';
import { getApiBaseUrl } from '@/lib/runtime-public-env';
import type { ApiResult } from '@cmp/utils';

export { getApiBaseUrl, getRuntimePublicEnvScript } from '@/lib/runtime-public-env';

export async function getApiAccessToken(): Promise<string | null> {
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

let cachedClientToken: string | null = null;
let cachedClientTokenAt = 0;

async function getClientAccessToken(): Promise<string | null> {
  if (cachedClientToken && Date.now() - cachedClientTokenAt < 60_000) {
    return cachedClientToken;
  }
  try {
    const res = await fetch('/api/auth/access-token', { credentials: 'include' });
    if (!res.ok) return null;
    const json = (await res.json()) as { accessToken?: string };
    cachedClientToken = json.accessToken ?? null;
    cachedClientTokenAt = Date.now();
    return cachedClientToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string; skipAuth?: boolean } = {},
): Promise<ApiResult<T>> {
  const apiUrl = getApiBaseUrl();
  const { accessToken, skipAuth, headers, ...rest } = options;

  let token = accessToken;
  if (!token && !skipAuth) {
    token = (await getClientAccessToken()) ?? undefined;
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Cannot reach the API at ${apiUrl}.`,
      },
    };
  }

  return response.json() as Promise<ApiResult<T>>;
}

export function getApiUrl(): string {
  return getApiBaseUrl();
}

export function clearStoredTokens() {
  cachedClientToken = null;
  cachedClientTokenAt = 0;
}

export function getStoredTokens() {
  return null;
}

export function setStoredTokens() {
  // Auth0 access tokens are fetched per request; no localStorage tokens.
}

export { downloadBlob } from '@cmp/utils';
