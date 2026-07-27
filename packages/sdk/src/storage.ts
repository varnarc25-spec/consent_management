const COOKIE_PREFIX = 'cmp_';

function encodeCookieValue(value: string) {
  return encodeURIComponent(value);
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_PREFIX}${name}=([^;]*)`));
  return match?.[1] ? decodeCookieValue(match[1]) : null;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_PREFIX}${name}=${encodeCookieValue(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_PREFIX}${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readStorage(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) return value;
    } catch {
      // localStorage may be blocked
    }
  }
  return readCookie(key.replace(/^cmp_/, ''));
}

export function writeStorage(key: string, value: string, maxAgeSeconds = 31_536_000) {
  let persisted = false;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
      persisted = true;
    } catch {
      // fall back to cookie
    }
  }
  if (!persisted) {
    writeCookie(key.replace(/^cmp_/, ''), value, maxAgeSeconds);
  }
}

export function removeStorage(key: string) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  removeCookie(key.replace(/^cmp_/, ''));
}
