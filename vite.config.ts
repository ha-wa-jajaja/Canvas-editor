import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Dev server for manual iteration on the canvas editor.
//
// The e2e harness (test-harness/app.js) imports the *built* package via
// `../dist/index.js`, which requires `npm run build` after every change. For
// dev we don't want that round-trip, so we alias that import to the live
// TypeScript source. Vite serves test-harness/index.html with on-the-fly TS
// transforms and hot module reloading — edit src/*.ts and the browser updates.
//
// e2e is unaffected: it never loads this config (see vitest.e2e.config.ts).
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
