import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuth0Configured, appBaseUrlMatchesHost } from '@cmp/auth';
import { getAuth0 } from './lib/auth0';

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/onboarding', '/verify-email', '/websites'];

function isAuthRoute(pathname: string) {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    if (pathname === '/auth/callback' && request.nextUrl.searchParams.has('error')) {
      const description =
        request.nextUrl.searchParams.get('error_description') ??
        request.nextUrl.searchParams.get('error') ??
        'Login failed';
      const home = new URL('/', request.url);
      home.searchParams.set('login_error', description);
      return NextResponse.redirect(home);
    }

    if (isAuthRoute(pathname) && !isAuth0Configured()) {
      const adminUrl =
        process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, '') ||
        'https://consent-management-admin-414895350436.us-central1.run.app';
      const loginPath = pathname === '/auth/logout' ? '/auth/logout' : '/auth/login';
      const target = new URL(`${adminUrl}${loginPath}`);
      request.nextUrl.searchParams.forEach((value, key) => {
        target.searchParams.set(key, value);
      });
      return NextResponse.redirect(target);
    }

    if (!isAuth0Configured() || !appBaseUrlMatchesHost(request.nextUrl.host)) {
      return NextResponse.next();
    }

    const authResponse = await getAuth0().middleware(request);

    if (isAuthRoute(pathname)) {
      return authResponse;
    }

    if (isProtectedPath(pathname)) {
      const session = await getAuth0().getSession(request);
      if (!session?.user) {
        const login = new URL('/auth/login', request.url);
        login.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(login);
      }
    }

    return authResponse;
  } catch (err) {
    console.error('[middleware] Fatal auth error:', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|loading-spinner.png|sitemap.xml|robots.txt).*)'],
};
