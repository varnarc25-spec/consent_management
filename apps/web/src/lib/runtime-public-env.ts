declare global {
  interface Window {
    __CMP_PUBLIC_ENV__?: {
      apiUrl?: string;
      appUrl?: string;
    };
  }
}

export function getRuntimePublicEnvScript(): string | null {
  const apiUrl = process.env.API_URL?.trim();
  const appUrl = process.env.APP_BASE_URL?.trim();
  if (!apiUrl && !appUrl) return null;
  const payload = JSON.stringify({ apiUrl, appUrl });
  return `window.__CMP_PUBLIC_ENV__=${payload};`;
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.__CMP_PUBLIC_ENV__?.apiUrl) {
    return window.__CMP_PUBLIC_ENV__.apiUrl.replace(/\/$/, '');
  }
  const fromEnv = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://localhost:4000/api/v1';
}
