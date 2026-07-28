import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuth0Configured, isAuthUiEnabled, appBaseUrlMatchesHost } from '@cmp/auth';
import { auth0 } from './lib/auth0';

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
    const authReady =
      isAuth0Configured() ||
      (isAuthRoute && isAuthUiEnabled() && Boolean(process.env.AUTH0_DOMAIN?.trim()));

    if (!authReady || !appBaseUrlMatchesHost(request.nextUrl.host)) {
      return NextResponse.next();
    }

    const authResponse = await auth0.middleware(request);

    if (isAuthRoute) {
      return authResponse;
    }

    try {
      const session = await auth0.getSession(request);
      if (session) {
        const audience = process.env.AUTH0_AUDIENCE;
        await auth0.getAccessToken(request, authResponse as NextResponse, {
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
