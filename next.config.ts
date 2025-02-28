/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-storage-url.supabase.co'],
  },
  ignoreBuildErrors: true,
};

export default nextConfig;