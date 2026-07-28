import { auth0 } from '@/lib/auth0';
import { apiServerFetch } from '@/lib/api';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'No session' }, { status: 401 });
  }

  const user = session.user as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  const result = await apiServerFetch('/auth/sync', {
    method: 'POST',
    body: JSON.stringify({
      sub: user.sub,
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      picture: user.picture,
    }),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
