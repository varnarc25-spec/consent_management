import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0ClientOptions } from '@cmp/auth';

let auth0Client: Auth0Client | undefined;

export function getAuth0() {
  if (!auth0Client) {
    auth0Client = new Auth0Client({
      ...getAuth0ClientOptions(),
      authorizationParameters: {
        scope: 'openid profile email',
        // Login uses identity only; CMP API tokens are issued via /auth/auth0/callback after sync.
      },
    });
  }
  return auth0Client;
}

export function isAuth0Configured() {
  return Boolean(
    process.env.AUTH0_DOMAIN?.trim() &&
      process.env.AUTH0_CLIENT_ID?.trim() &&
      process.env.AUTH0_SECRET?.trim(),
  );
}
