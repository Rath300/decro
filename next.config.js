/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now default in Next.js 14
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'supabase.co',
      },
    ],
    domains: ['supabase.co'],
  },
}

module.exports = nextConfig 