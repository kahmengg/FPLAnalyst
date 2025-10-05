/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable static optimization for pages that need runtime API calls
  output: undefined, // Remove any static export configuration
  trailingSlash: false,
  // Handle build-time issues with dynamic pages
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Ensure proper SSR handling
  reactStrictMode: true,
  // Handle dynamic routes properly
  async rewrites() {
    return []
  },
}

export default nextConfig
