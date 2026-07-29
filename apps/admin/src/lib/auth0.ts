import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0ClientId, getAuth0ClientOptions, getAuth0ClientSecret, isAuth0Configured } from '@cmp/auth';

let auth0Client: Auth0Client | undefined;

export function getAuth0() {
  if (!auth0Client) {
    auth0Client = new Auth0Client({
      ...getAuth0ClientOptions(),
      clientId: getAuth0ClientId(),
      clientSecret: getAuth0ClientSecret(),
      authorizationParameters: {
        scope: 'openid profile email',
        // Login uses identity only; CMP API tokens are issued via /auth/auth0/callback after sync.
      },
    });
  }
  return auth0Client;
}

export { isAuth0Configured };
