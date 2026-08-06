import { getAuth0SessionFromRequest } from '@/lib/auth0-session.server';
import { serializeAuth0User } from '@/lib/auth0-user';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuth0SessionFromRequest(request);
    if (!session?.user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({
      user: serializeAuth0User(session.user as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
