import { createMDX } from 'fumadocs-mdx/next'
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://seo.ai.rio.br',
  },
}

export default createMDX()(config)
