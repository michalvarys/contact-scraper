import { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

// Přidáme bundle analyzer pro analýzu velikosti bundle
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'http://api:3002' : 'http://localhost:3002');

const nextConfig: NextConfig = {
  // Optimalizace pro statické stránky
  // output: 'standalone',

  // Optimalizace pro obrázky
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      {
        source: '/output/:path*',
        destination: '/output/:path*',
      },
      {
        source: '/api/trpc/:path*',
        // destination: '/api/trpc/:path*',
        destination: `${apiBaseUrl}/trpc/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Fallback pro node moduly
    config.resolve.fallback = { fs: false, net: false, tls: false };

    // Optimalizace code-splitting
    if (!isServer) {
      // Nastavení pro lepší code-splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk pro knihovny třetích stran
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            enforce: true,
          },
          // Chunk pro React a související knihovny
          react: {
            name: 'react',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Chunk pro UI komponenty
          ui: {
            name: 'ui',
            test: /[\\/]components[\\/]atoms[\\/]/,
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // Chunk pro hooks
          hooks: {
            name: 'hooks',
            test: /[\\/]hooks[\\/]/,
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
        },
      };
    }

    return config;
  },
};

module.exports = withAnalyzer(nextConfig);
