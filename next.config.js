/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Don't bundle these — let Node.js require() them natively.
    // apify-client uses dynamic require('proxy-agent') which webpack can't handle.
    serverComponentsExternalPackages: ['apify-client', 'proxy-agent', 'got-scraping'],
  },
};

module.exports = nextConfig;
