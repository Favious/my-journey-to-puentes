import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Ensure static assets are properly served
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // Enable static file serving
  trailingSlash: false,
  // Ensure fonts are properly loaded
  experimental: {
    // optimizeCss: true, // Disabled due to critters dependency issue
  },
  // Headers for font loading
  async headers() {
    return [
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/:path*\\.(png|jpg|jpeg|gif|webp|svg|ico|avif|mp3|wav|ogg|gltf|bin)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
