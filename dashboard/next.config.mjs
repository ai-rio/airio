/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  experimental: {
    nodeMiddleware: true,
  },
}

export default nextConfig
