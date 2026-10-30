import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    'localhost',
    'localhost:3005',
    '127.0.0.1',
    '127.0.0.1:3005',
    '192.168.1.8',
    '192.168.1.8:3005',
    '172.20.10.3',
    '172.20.10.3:3005',
    '192.168.1.6',
    '192.168.1.6:3005',
    '192.168.1.11',
    '192.168.1.11:3005',
    '192.168.1.*',
    '192.168.*.*',
    '*.ngrok-free.dev',
  ],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'http', hostname: '192.168.1.8', port: '8000' },
      { protocol: 'http', hostname: '192.168.1.11', port: '8000' },
      { protocol: 'http', hostname: '169.58.189.159', port: '8000' },
      { protocol: 'http', hostname: '192.168.100.17', port: '8000' },
      { protocol: 'http', hostname: '192.168.1.12', port: '8000' },
      { protocol: 'https', hostname: '*.ngrok-free.dev' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'www.google.com' },
      { protocol: 'https', hostname: 'www.microsoft.com' },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: '/qr_codes/:path*',
        destination: `${backendUrl}/qr_codes/:path*`,
      },
      {
        source: '/documents/:path*',
        destination: `${backendUrl}/documents/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/register',
        destination: '/login',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/download/unisphereai.apk',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/vnd.android.package-archive',
          },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="unisphereai.apk"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;