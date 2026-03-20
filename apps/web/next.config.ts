const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/leadflow-ai-production\.up\.railway\.app\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: { cacheName: 'images', expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 } },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  reactStrictMode: false,
  swcMinify: true,
  images: { domains: ['files2.heygen.ai', 'i.pinimg.com', 'leadflow-ai-production.up.railway.app'] },
})

module.exports = nextConfig