import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getAppBaseUrl,
  getRequestHost,
  isAuth0Configured,
  appBaseUrlMatchesHost,
} from '@cmp/auth';
import { getAuth0 } from './lib/auth0';

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/onboarding', '/verify-email', '/websites'];

function isAuthRoute(pathname: string) {
  return pathname === '/auth' || pathname.startsWith('/auth/');
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function loginUrl(request: NextRequest, returnTo?: string) {
  const login = new URL('/auth/login', getAppBaseUrl());
  if (returnTo) {
    login.searchParams.set('returnTo', returnTo);
  }
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'returnTo') {
      login.searchParams.set(key, value);
    }
  });
  return login;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    if (pathname === '/auth/callback' && request.nextUrl.searchParams.has('error')) {
      const description =
        request.nextUrl.searchParams.get('error_description') ??
        request.nextUrl.searchParams.get('error') ??
        'Login failed';
      const home = new URL('/', getAppBaseUrl());
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

    if (!isAuth0Configured()) {
      return NextResponse.next();
    }

    if (isAuthRoute(pathname)) {
      return await getAuth0().middleware(request);
    }

    const requestHost = getRequestHost(request.headers, request.nextUrl.host);
    if (!appBaseUrlMatchesHost(requestHost)) {
      return NextResponse.next();
    }

    const authResponse = await getAuth0().middleware(request);

    if (isProtectedPath(pathname)) {
      const session = await getAuth0().getSession(request);
      if (!session?.user) {
        return NextResponse.redirect(
          loginUrl(request, `${pathname}${request.nextUrl.search}`),
        );
      }
    }

    return authResponse;
  } catch (err) {
    console.error('[middleware] Fatal auth error:', err);
    if (isAuthRoute(pathname)) {
      return new NextResponse('Authentication is temporarily unavailable.', { status: 503 });
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|loading-spinner.png|sitemap.xml|robots.txt).*)'],
};
