import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const HARNESS_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../../')
const APP_ENTRY = join(HARNESS_ROOT, 'test-harness/app.js')
const APP_ROUTE = '/test-harness/app.js'
const PORT = 4321

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let server: any

// The package's dist output uses extensionless relative imports (e.g.
// `export * from './types'`), which native browser ES modules cannot resolve —
// its real consumer (Nuxt/Vite) bundles. So we bundle the harness entry (which
// imports ../dist/index.js) into one self-contained ESM file and serve that for
// the app.js request. This exercises the built package artifact in the browser.
async function bundleHarnessApp(): Promise<string> {
  const result = await build({
    entryPoints: [APP_ENTRY],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  })
  return result.outputFiles[0].text
}

export async function setup() {
  const distEntry = join(HARNESS_ROOT, 'dist/index.js')
  if (!existsSync(distEntry)) {
    throw new Error(
      `[global-setup] dist/index.js not found at ${distEntry}.\n` +
        `Run "npm run build" inside extract-canvas/ before running e2e tests.`
    )
  }

  const appBundle = await bundleHarnessApp()

  await new Promise<void>((resolve, reject) => {
    server = createServer((req, res) => {
      const rawUrl = req.url ?? '/'
      const urlPath = rawUrl === '/' ? '/test-harness/' : rawUrl.split('?')[0]

      // Serve the esbuild-bundled harness app for the module entry point
      if (urlPath === APP_ROUTE) {
        res.writeHead(200, { 'Content-Type': MIME['.js'] })
        res.end(appBundle)
        return
      }

      let filePath = join(HARNESS_ROOT, urlPath)

      // Directory requests (e.g. "/test-harness/") serve index.html
      if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = join(filePath, 'index.html')
      }

      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end(`Not found: ${urlPath}`)
        return
      }

      try {
        const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': mime })
        res.end(readFileSync(filePath))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end(`Error reading ${urlPath}: ${(err as Error).message}`)
      }
    })

    server.on('error', reject)
    server.listen(PORT, () => {
      console.log(`[global-setup] Test harness running at http://localhost:${PORT}`)
      resolve()
    })
  })
}

export async function teardown() {
  await new Promise<void>((resolve) => server?.close(resolve))
}
