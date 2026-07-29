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

function isProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.includes('consent-management-web') ||
    window.location.hostname.includes('consent-management-admin')
  );
}

export function getRuntimePublicEnvScript(): string | null {
  const apiUrl =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : undefined);
  const appUrl = process.env.APP_BASE_URL?.trim();
  if (!apiUrl && !appUrl) return null;
  const payload = JSON.stringify({ apiUrl, appUrl });
  return `window.__CMP_PUBLIC_ENV__=${payload};`;
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.__CMP_PUBLIC_ENV__?.apiUrl) {
    return window.__CMP_PUBLIC_ENV__.apiUrl.replace(/\/$/, '');
  }

  if (isProductionHost()) {
    return PRODUCTION_API_URL;
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_API_URL;
  }

  return 'http://localhost:4000/api/v1';
}
