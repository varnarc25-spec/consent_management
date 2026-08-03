import { getApiBaseUrl } from '@/lib/runtime-public-env';
import type { ApiResult } from '@cmp/utils';
import { startLoading, stopLoading } from '@/lib/loading-store';

export { getApiBaseUrl, getRuntimePublicEnvScript } from '@/lib/runtime-public-env';

let cachedClientToken: string | null = null;
let cachedClientTokenAt = 0;

async function syncAuthSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

async function getClientAccessToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedClientToken && Date.now() - cachedClientTokenAt < 60_000) {
    return cachedClientToken;
  }
  try {
    const res = await fetch('/api/auth/access-token', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      if (!forceRefresh) {
        await syncAuthSession();
        return getClientAccessToken(true);
      }
      return null;
    }
    const json = (await res.json()) as { accessToken?: string };
    cachedClientToken = json.accessToken ?? null;
    cachedClientTokenAt = Date.now();
    return cachedClientToken;
  } catch {
    return null;
  }
}

async function parseApiResponse<T>(response: Response): Promise<ApiResult<T>> {
  if (response.status === 401) {
    return {
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session expired. Please sign in again.',
      },
    };
  }

  if (response.status === 204 || response.status === 304) {
    return {
      ok: false,
      error: {
        code: 'EMPTY_RESPONSE',
        message: 'Unexpected empty API response. Refresh the page and try again.',
      },
    };
  }

  const text = await response.text();
  if (!text.trim()) {
    return {
      ok: false,
      error: {
        code: 'EMPTY_RESPONSE',
        message: 'Empty API response.',
      },
    };
  }

  try {
    return JSON.parse(text) as ApiResult<T>;
  } catch {
    return {
      ok: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid API response.',
      },
    };
  }
}

export async function ensureApiSession(): Promise<boolean> {
  await syncAuthSession();
  const token = await getClientAccessToken(true);
  return Boolean(token);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string; skipAuth?: boolean } = {},
): Promise<ApiResult<T>> {
  startLoading();
  try {
    return await apiFetchInternal<T>(path, options);
  } finally {
    stopLoading();
  }
}

async function apiFetchInternal<T>(
  path: string,
  options: RequestInit & { accessToken?: string; skipAuth?: boolean } = {},
): Promise<ApiResult<T>> {
  const apiUrl = getApiBaseUrl();
  const { accessToken, skipAuth, headers, ...rest } = options;

  let token = accessToken;
  if (!token && !skipAuth) {
    token = (await getClientAccessToken()) ?? undefined;
  }

  const doFetch = (bearer?: string) =>
    fetch(`${apiUrl}${path}`, {
      ...rest,
      cache: 'no-store',
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

  return parseApiResponse<T>(response);
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
