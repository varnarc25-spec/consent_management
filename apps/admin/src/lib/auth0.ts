import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3001',
  signInReturnToPath: '/auth/sync',
});

export function isAuth0Configured() {
  return Boolean(
    process.env.AUTH0_DOMAIN?.trim() &&
      process.env.AUTH0_CLIENT_ID?.trim() &&
      process.env.AUTH0_SECRET?.trim(),
  );
}
