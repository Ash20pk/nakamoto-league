/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-storage-url.supabase.co'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;