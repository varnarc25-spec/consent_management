declare global {
  interface Window {
    __CMP_PUBLIC_ENV__?: {
      apiUrl?: string;
      appUrl?: string;
    };
  }
}

const PRODUCTION_API_URL =
  'https://consent-management-api-414895350436.us-central1.run.app/api/v1';

function isProductionWebHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('consent-management-web');
}

/** Ensure API base URL always includes /api/v1 for REST calls. */
export function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return trimmed;
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (/\/api\/v\d+$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
}

export function getRuntimePublicEnvScript(): string | null {
  const apiUrl = normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
      process.env.API_URL?.trim() ||
      (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : 'http://localhost:4000'),
  );
  const appUrl = process.env.APP_BASE_URL?.trim();
  if (!apiUrl && !appUrl) return null;
  const payload = JSON.stringify({ apiUrl, appUrl });
  return `window.__CMP_PUBLIC_ENV__=${payload};`;
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.__CMP_PUBLIC_ENV__?.apiUrl) {
    return normalizeApiBaseUrl(window.__CMP_PUBLIC_ENV__.apiUrl);
  }

  if (isProductionWebHost()) {
    return PRODUCTION_API_URL;
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;
  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_API_URL;
  }

  return 'http://localhost:4000/api/v1';
}
