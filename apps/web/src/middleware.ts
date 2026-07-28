import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuth0Configured, appBaseUrlMatchesHost } from '@cmp/auth';
import { getAuth0 } from './lib/auth0';

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
      return getAuth0().middleware(request);
    }

    if (!isAuth0Configured() || !appBaseUrlMatchesHost(request.nextUrl.host)) {
      return NextResponse.next();
    }

    const authResponse = await getAuth0().middleware(request);

    try {
      const session = await getAuth0().getSession(request);
      if (session) {
        const audience = process.env.AUTH0_AUDIENCE;
        await getAuth0().getAccessToken(request, authResponse as NextResponse, {
          ...(audience ? { audience } : {}),
        });
      }
    } catch {
      // Optional auth on marketing site
    }

    return authResponse;
  } catch (err) {
    console.error('[middleware] Fatal auth error:', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
