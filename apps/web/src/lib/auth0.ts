import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0ClientOptions } from '@cmp/auth';

export const auth0 = new Auth0Client({
  ...getAuth0ClientOptions(),
  authorizationParameters: {
    scope: 'openid profile email',
    ...(process.env.AUTH0_AUDIENCE ? { audience: process.env.AUTH0_AUDIENCE } : {}),
  },
});
