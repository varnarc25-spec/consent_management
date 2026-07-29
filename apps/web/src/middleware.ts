import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuth0Configured, appBaseUrlMatchesHost } from '@cmp/auth';
import { getAuth0 } from './lib/auth0';

const PUBLIC = ['/auth'];
const PROTECTED = ['/dashboard', '/settings', '/onboarding', '/verify-email'];

function isPublicPath(pathname: string) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedPath(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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

    const isAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/');

    if (isAuthRoute) {
      if (!isAuth0Configured()) {
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
      try {
        return await getAuth0().middleware(request);
      } catch (err) {
        console.error('[middleware] Auth route error:', err);
        const home = new URL('/', request.url);
        home.searchParams.set('login_error', 'Sign-in failed. Please try again.');
        return NextResponse.redirect(home);
      }
    }

    if (isAuth0Configured() && isProtectedPath(pathname) && !isPublicPath(pathname)) {
      try {
        const session = await getAuth0().getSession(request);
        if (!session?.user) {
          const login = new URL('/auth/login', request.url);
          login.searchParams.set('returnTo', pathname + request.nextUrl.search);
          return NextResponse.redirect(login);
        }
      } catch (err) {
        console.error('[middleware] Protected route session check:', err);
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }

    if (!isAuth0Configured() || !appBaseUrlMatchesHost(request.nextUrl.host)) {
      return NextResponse.next();
    }

    return await getAuth0().middleware(request);
  } catch (err) {
    console.error('[middleware] Fatal auth error:', err);
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
