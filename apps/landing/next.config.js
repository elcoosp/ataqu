/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Lingui SWC plugin for macros
    swcPlugins: [
      ['@lingui/swc-plugin', {}]
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // i18n routing
  i18n: {
    locales: ['en', 'fr', 'de', 'es', 'pt'],
    defaultLocale: 'en',
  },
};

module.exports = nextConfig;
