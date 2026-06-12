import { defineConfig } from 'vitest/config'

// Real-browser component tests. Mounts CanvasEditor directly onto a real
// <canvas> in a headless Chromium (via the Playwright provider) — no dev
// server, no harness page. This exercises what happy-dom cannot: a real 2D
// rendering context and the real offsetX/offsetY coordinate pipeline derived
// from actual layout / getBoundingClientRect.
export default defineConfig({
  test: {
    include: ['src/tests/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
  },
})
