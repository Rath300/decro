/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is default in newer Next versions
  typescript: {
    // Avoid type-check blocking builds; use your editor or `next lint` instead
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during builds to speed things up
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        // Ignore heavy folders that don't affect TS/JS code
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/test-data/**',
          '**/public/uploads/**',
        ],
      }
    }
    return config
  },
}

module.exports = nextConfig