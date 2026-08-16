/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Autoriser les IPs locales et ngrok
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.100.17',
    '192.168.1.12',
    '*.ngrok-free.dev'
  ],

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'http', hostname: '192.168.100.17', port: '8000' },
      { protocol: 'http', hostname: '192.168.1.12', port: '8000' },
      { protocol: 'https', hostname: '*.ngrok-free.dev' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },

  // ✅ Proxy backend : Next.js fait le relais vers localhost:8000
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8000/uploads/:path*',
      },
      {
        source: '/qr_codes/:path*',
        destination: 'http://localhost:8000/qr_codes/:path*',
      },
      {
        source: '/documents/:path*',
        destination: 'http://localhost:8000/documents/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:8000/health',
      },
    ];
  },
};

module.exports = nextConfig;

