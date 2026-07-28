import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0ClientOptions } from '@cmp/auth';

let auth0Client: Auth0Client | undefined;

export function getAuth0() {
  if (!auth0Client) {
    auth0Client = new Auth0Client({
      ...getAuth0ClientOptions(),
      authorizationParameters: {
        scope: 'openid profile email',
        // Marketing site only needs identity login — no CMP API audience.
      },
    });
  }
  return auth0Client;
}
