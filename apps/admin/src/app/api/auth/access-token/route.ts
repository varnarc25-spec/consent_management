import { getAuth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const audience = process.env.AUTH0_AUDIENCE;
    const result = await getAuth0().getAccessToken(audience ? { audience } : undefined);
    if (!result?.token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ accessToken: result.token });
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
