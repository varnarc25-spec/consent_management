import { getApiBaseUrl } from '@/lib/runtime-public-env';
import type { ApiResult } from '@cmp/utils';
import { startLoading, stopLoading } from '@/lib/loading-store';

export { getApiBaseUrl, getRuntimePublicEnvScript } from '@/lib/runtime-public-env';

let cachedClientToken: string | null = null;
let cachedClientTokenAt = 0;

async function syncAuthSession(): Promise<void> {
  try {
    await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
  } catch {
    // Ignore — access-token may still work via refresh or Auth0 session.
  }
}

async function getClientAccessToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedClientToken && Date.now() - cachedClientTokenAt < 60_000) {
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
  options: RequestInit & { accessToken?: string; skipAuth?: boolean; silent?: boolean } = {},
): Promise<ApiResult<T>> {
  if (options.silent) {
    return apiFetchInternal<T>(path, options);
  }
  startLoading();
  try {
    return await apiFetchInternal<T>(path, options);
  } finally {
    stopLoading();
  }
}

async function apiFetchInternal<T>(
  path: string,
  options: RequestInit & { accessToken?: string; skipAuth?: boolean; silent?: boolean } = {},
): Promise<ApiResult<T>> {
  const apiUrl = getApiBaseUrl();
  const { accessToken, skipAuth, silent: _silent, headers, ...rest } = options;

  let token = accessToken;
  if (!token && !skipAuth) {
    token = (await getClientAccessToken()) ?? undefined;
  }

  const doFetch = (bearer?: string) =>
    fetch(`${apiUrl}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...headers,
      },
    });

  let response: Response;
  try {
    response = await doFetch(token);
  } catch {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Cannot reach the API at ${apiUrl}.`,
      },
    };
  }

  if (response.status === 401 && !skipAuth && !accessToken) {
    cachedClientToken = null;
    cachedClientTokenAt = 0;
    await syncAuthSession();
    token = (await getClientAccessToken(true)) ?? undefined;
    if (token) {
      try {
        response = await doFetch(token);
      } catch {
        return {
          ok: false,
          error: {
            code: 'NETWORK_ERROR',
            message: `Cannot reach the API at ${apiUrl}.`,
          },
        };
      }
    }
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
