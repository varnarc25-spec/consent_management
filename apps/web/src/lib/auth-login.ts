export function authLoginPath(returnTo = '/dashboard'): string {
  const path = returnTo.startsWith('/') ? returnTo : '/dashboard';
  return `/auth/login?returnTo=${encodeURIComponent(path)}`;
}

export function redirectToAuthLogin(returnTo?: string) {
  const target =
    returnTo ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/dashboard');
  window.location.assign(authLoginPath(target));
}
