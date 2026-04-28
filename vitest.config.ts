import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['convex/**/*.test.ts', 'convex/**/*.spec.ts'],
    globals: true,
  },
})
