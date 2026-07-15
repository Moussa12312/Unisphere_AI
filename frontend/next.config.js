/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Autoriser les IPs locales et ngrok
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.5',
    '192.168.1.12',
    '*.ngrok-free.dev'
  ],
  
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '192.168.1.5', port: '8000' },
      { protocol: 'http', hostname: '192.168.1.12', port: '8000' },
      { protocol: 'https', hostname: '*.ngrok-free.dev' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
};

module.exports = nextConfig;