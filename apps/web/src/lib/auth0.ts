import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0ClientId, getAuth0ClientOptions, getAuth0ClientSecret } from '@cmp/auth';

let auth0Client: Auth0Client | undefined;

export function getAuth0() {
  if (!auth0Client) {
    auth0Client = new Auth0Client({
      ...getAuth0ClientOptions(),
      clientId: getAuth0ClientId(),
      clientSecret: getAuth0ClientSecret(),
      authorizationParameters: {
        scope: 'openid profile email offline_access',
        ...(process.env.AUTH0_AUDIENCE ? { audience: process.env.AUTH0_AUDIENCE } : {}),
      },
    });
  }
  return auth0Client;
}
