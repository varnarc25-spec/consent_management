const path = require('path');
const { config } = require('dotenv');

config({ path: path.join(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@cmp/auth', '@cmp/utils'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ADMIN_URL: process.env.ADMIN_URL,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_CONFIGURED: process.env.AUTH0_DOMAIN ? 'true' : 'false',
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
  },
};

module.exports = nextConfig;
