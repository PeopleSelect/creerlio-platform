import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "connect-src 'self' http://localhost:* https://*.app.github.dev https://api.mapbox.com https://*.tiles.mapbox.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
