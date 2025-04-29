/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'ctoihotqtanjsgytwwzk.supabase.co', // Supabase storage domain
      'localhost'
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint during builds
  },
}

module.exports = nextConfig
