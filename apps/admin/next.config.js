/** @type {import('next').NextConfig} */
const path = require('path');
const { config } = require('dotenv');

config({ path: path.join(__dirname, '../../.env') });

const nextConfig = {
  transpilePackages: ['@cmp/auth', '@cmp/types', '@cmp/utils'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  },
};

module.exports = nextConfig;
