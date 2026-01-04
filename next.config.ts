import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  async rewrites() {
    return [
      {
        source: '/api/binance/:path*',
        destination: 'https://testnet.binance.vision/api/v3/:path*',
      },
    ];
  },
};

export default nextConfig;
