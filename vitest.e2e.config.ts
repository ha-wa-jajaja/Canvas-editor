import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    globalSetup: './src/tests/global-setup.ts',
    testTimeout: 45000,
    hookTimeout: 30000,
  },
})
