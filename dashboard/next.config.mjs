/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
transpilePackages: ['@airio/convex'],
}

export default nextConfig
