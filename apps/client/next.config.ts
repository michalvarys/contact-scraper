import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/output/:path*',
        destination: '/output/:path*',
      },
      {
        source: '/api/trpc/:path*',
        // destination: '/api/trpc/:path*',
        destination: 'http://localhost:3000/trpc/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
