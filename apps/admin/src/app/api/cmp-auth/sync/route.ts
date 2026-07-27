import { NextResponse } from 'next/server';
import { auth0, isAuth0Configured } from '@/lib/auth0';

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
}

export async function GET() {
  if (!isAuth0Configured()) {
    return NextResponse.json(
      { ok: false, error: { code: 'AUTH0_NOT_CONFIGURED', message: 'Auth0 is not configured' } },
      { status: 400 },
    );
  }

  const session = await auth0.getSession();
  if (!session?.tokenSet?.idToken) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'No Auth0 session found' } },
      { status: 401 },
    );
  }

  const response = await fetch(`${getApiUrl()}/auth/auth0/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: session.tokenSet.idToken }),
  });

  const result = await response.json();
  return NextResponse.json(result, { status: response.status });
}
