import 'server-only';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { getAuth0 } from '@/lib/auth0';

export async function getAuth0SessionFromRequest(request: NextRequest) {
  return getAuth0().getSession(request);
}

export async function getAuth0SessionFromHeaders() {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000';
  const proto = headerList.get('x-forwarded-proto') ?? 'http';
  const request = new NextRequest(`${proto}://${host}/`, { headers: headerList });
  return getAuth0SessionFromRequest(request);
}
