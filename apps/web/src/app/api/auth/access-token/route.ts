import { cookies } from 'next/headers';
import { getAuth0 } from '@/lib/auth0';
import { ACCESS_COOKIE } from '@/app/api/auth/sync/route';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const cmpToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (cmpToken) {
    return NextResponse.json({ accessToken: cmpToken });
  }

  try {
    const audience = process.env.AUTH0_AUDIENCE;
    const result = await getAuth0().getAccessToken(audience ? { audience } : undefined);
    if (result?.token) {
      return NextResponse.json({ accessToken: result.token });
    }
  } catch {
    // Fall through to 401
  }

  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
