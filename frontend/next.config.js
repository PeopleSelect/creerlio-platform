const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  compiler: {
    removeConsole: false,
  },

  // Build-time safety (Windows + Vercel)

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'mapbox-gl': 'mapbox-gl',
    };
    return config;
  },

  async redirects() {
    return [
      {
        source: '/dashboard/talent',
        destination: '/dashboard/talent-v2',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

