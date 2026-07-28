const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@cmp/utils'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
