import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Dev server for manual iteration on the canvas editor (see MANUAL-VERIFICATION.md).
//
// The harness (test-harness/app.js) is a manual playground only — the automated
// tests no longer use it (they mount CanvasEditor directly via Vitest Browser
// Mode; see vitest.browser.config.ts).
//
// app.js imports the *built* package via `../dist/index.js`, which would require
// `npm run build` after every change. For dev we alias that import to the live
// TypeScript source, so Vite serves test-harness/index.html with on-the-fly TS
// transforms and hot module reloading — edit src/*.ts and the browser updates.
export default defineConfig({
  root: fileURLToPath(new URL('./test-harness', import.meta.url)),
  resolve: {
    alias: [
      {
        find: /^\.\.\/dist\/index\.js$/,
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    port: 4321,
    open: true,
  },
})
