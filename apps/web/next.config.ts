import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // @vela/ui and @vela/contracts ship TypeScript source — Next transpiles them.
  transpilePackages: ['@vela/ui', '@vela/contracts'],
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    // Proxy /api/* to the NestJS API so the browser uses same-origin cookies in dev.
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${api}/:path*` }];
  },
};

export default config;
