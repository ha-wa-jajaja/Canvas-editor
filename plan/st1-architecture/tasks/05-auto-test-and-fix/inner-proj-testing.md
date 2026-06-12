# Extract-Canvas Standalone E2E Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Playwright integration tests in `extract-canvas/src/tests/template-editor.test.ts` run entirely within the `extract-canvas` package — no Nuxt dev server required.

**Architecture:** Create a self-contained HTML/JS test harness inside `extract-canvas/test-harness/` that replicates the `pages/manual/template-editor.vue` page using vanilla JS. A minimal Node.js HTTP server (zero new dependencies, uses `node:http`) starts/stops via vitest's `globalSetup` hook. A new `vitest.e2e.config.ts` wires the server to the Playwright tests.

**Tech Stack:** Vitest globalSetup, Node.js `node:http`, Playwright (already in project), vanilla JS ES modules, TypeScript compiled to `dist/`.

---

## Progress

| Task | Status |
|------|--------|
| Task 1 — HTML harness skeleton (`index.html`) | ✅ Done |
| Task 2 — `app.js` editor logic | ✅ Done |
| Task 3 — vitest `global-setup.ts` HTTP server | ✅ Done (server + esbuild bundling + dir handling) |
| Task 4 — `vitest.e2e.config.ts` | ✅ Done |
| Task 5 — Update test URL / `openPage` | ✅ Done |
| Task 6 — `package.json` `test:e2e` script | ✅ Done |
| Task 7 — Run e2e suite & fix failures | ✅ Done — **11/11 e2e + 65/65 unit pass, no Nuxt** |

**Final result:** `npm run test:e2e` → build + 11/11 e2e pass (~6s) against the standalone harness on port 4321. `npm test` → 65/65 unit pass. No Nuxt dev server required.

### Findings during execution (read these — they shaped the implementation)

1. **The e2e suite was silently passing against Nuxt, not the harness.** Before Task 5, `EDITOR_URL` still pointed at `localhost:3000` and a Nuxt dev server happened to be running there, so an early run showed "11/11 pass" that proved nothing about the harness. Lesson for re-verification: confirm the run actually hits port 4321 (the harness run takes ~6s; the Nuxt path took ~39s).
2. **`global-setup.ts` directory requests crashed the server (`EISDIR`).** `GET /test-harness/` resolved to a directory; `readFileSync` on it threw and killed the process. Fixed by detecting directories (via `statSync`) and serving `index.html`, plus a `try/catch` returning 500 instead of crashing.
3. **The built package can't load in a raw browser — extensionless imports.** `dist/*.js` uses `export * from './types'` etc. (the package is built with `moduleResolution: Bundler` for its Vite/Nuxt consumer). Native browser ESM 404s on `./types`. **Solution:** `global-setup.ts` bundles `test-harness/app.js` (which imports `../dist/index.js`) with **esbuild** (`write:false`, in-memory) and serves the self-contained bundle for the `/test-harness/app.js` request. This exercises the real built artifact in the browser. Findings #1 & #2 from Task 2 (`onUpdate`-after-`loadItems`, dual `dragend`) held up — no further app.js changes were needed.

> **Standalone extraction — DONE.** The package was moved to a standalone location and the transitive monorepo deps had to be declared explicitly (the `build` failed with `tsc: command not found`). Added `devDependencies`: `typescript ^5.0.4`, `vitest ^1.6.1`, `playwright 1.46.1` (pinned exact to reuse the cached `chromium-1129` browser), `esbuild ^0.21.5` (used by `global-setup.ts`), `happy-dom ^15.10.2` (unit-test env), `@types/node ^18.19.34` (for `global-setup.ts` `node:` imports). After `npm install`: `npm run test:e2e` → 11/11, `npm test` → 65/65, both standalone.
>
> **Fresh-clone note:** on a machine without the Playwright browser cached, run `npx playwright install chromium` once before `npm run test:e2e`. Also add a `.gitignore` with `node_modules/` and `dist/` if this becomes its own repo.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `extract-canvas/test-harness/index.html` | Static page with exact CSS classes the tests target |
| Create | `extract-canvas/test-harness/app.js` | Vanilla JS: initialises CanvasEditor, wires UI interactions, updates JSON `<pre>` |
| Create | `extract-canvas/src/tests/global-setup.ts` | Starts/stops Node HTTP server on port 4321 before/after test suite |
| Create | `extract-canvas/vitest.e2e.config.ts` | Vitest config for e2e: includes `*.test.ts`, references globalSetup, 45 s timeout |
| Modify | `extract-canvas/src/tests/template-editor.test.ts` | Change `EDITOR_URL`, simplify `openPage` (remove Nuxt 404 workaround) |
| Modify | `extract-canvas/package.json` | Add `"test:e2e": "npm run build && vitest run --config vitest.e2e.config.ts"` |
| Modify | `extract-canvas/tsconfig.json` | Exclude `*.spec.ts` + `src/tests/**` from the library build (added during Task 3) |

---

## Task 1: Create the HTML test harness skeleton ✅

**Files:**
- Create: `extract-canvas/test-harness/index.html`

The CSS class names are **exact** — the Playwright selectors target them literally.

- [x] **Step 1: Create the HTML file** — done. See `extract-canvas/test-harness/index.html`.
  - Implemented per plan, plus `min-width: 400px` on `.canvas-wrapper` proactively added so headless Chromium reports a non-zero width (pre-empts the Task 7 / Step 2 failure mode).
- [x] **Step 2: Verify the file exists** — `ls extract-canvas/test-harness/index.html` succeeds (6438 bytes).

---

## Task 2: Create `app.js` — vanilla JS editor logic ✅

**Files:**
- Create: `extract-canvas/test-harness/app.js`

Replicates `components/Template/TemplateEditor.vue` + `pages/manual/template-editor.vue` in plain ESM JS, importing the compiled package from `../dist/index.js`.

- [x] **Step 1: Create the file** — done. See `extract-canvas/test-harness/app.js` (~10 KB).
- [x] **Step 2: Verify file exists** — `ls extract-canvas/test-harness/app.js` succeeds.

### API verified against source before writing

- Exports confirmed: `CanvasEditor` (`src/index.ts:4`) and `createUniqueId` (`src/utils/helpers.ts:7`, re-exported via `export * from './utils'`).
- Constructor options `{ canvas, dimensions, adapter:{fromItem,toItem,createItem}, onUpdate, onLayersChange }` and methods `loadItems` / `setDimensions` / `setContainerWidth` / `addDroppedItem` / `setLayerOrder` / `destroy` all match (`src/CanvasEditor.ts`).
- `CanvasDropPayload` (`src/types.ts:22`) — `minWidth`/`minHeight`/`maxHeight` are optional, so the harness omits them.

### Two findings baked in (previously deferred to Task 7)

1. **`loadItems` does not emit `onUpdate`** (`CanvasEditor.ts:84-105` calls `_draw()` + `_emitLayersChange()` only). The Vue page hides this by emitting the template structure directly. The harness therefore routes every load through a `loadStructure(structure)` helper that calls `editor.loadItems(structure)` **then** `onUpdate(structure)`, so the JSON `<pre>` populates on initial boot, on Load-button clicks, and on blank-canvas load. → pre-empts Task 7 / Step 3.
2. **Layer-reorder `dragend` reliability** — `setupLayerDnd` registers a `commitOrder` handler on **both** the container and `document`, since Playwright's synthetic `dragTo` can dispatch `dragend` off the original element. → pre-empts Task 7 / Step 4.

Also: `bootWithDefaultTemplate` runs from a `ResizeObserver` and from a synchronous `offsetWidth > 0` fallback, so the editor mounts whether or not layout has resolved when the module executes.

---

## Task 3: Create the vitest globalSetup — Node HTTP server ✅

**Files:**
- Create: `extract-canvas/src/tests/global-setup.ts`
- Modify: `extract-canvas/tsconfig.json` (exclude tests/specs from the library build — see note)

Serves the `extract-canvas/` directory on port 4321 so Playwright can reach `http://localhost:4321/test-harness/index.html`. Node built-ins only — no new dependency. `HARNESS_ROOT` resolves to `extract-canvas/` via `import.meta.url`, so both `/test-harness/*` and `/dist/*` are served.

> **Added: exclude tests from the library build.** `tsconfig.json` had `include: ["src/**/*.ts"]` with no `exclude`, so a fresh `npm run build` would compile `*.spec.ts`, `template-editor.test.ts` (imports `playwright`), and this new `global-setup.ts` (imports `node:*`) into `dist/` — coupling the shipped package to test-only deps. Since Task 7's `test:e2e` runs `npm run build` first, added `"exclude": ["node_modules", "dist", "src/**/*.spec.ts", "src/tests/**"]`. Verified: fresh build exits 0 and `dist/` stays library-only. Vitest collects tests independently of tsconfig, so unit + e2e runs are unaffected.

- [x] **Step 1: Create the file** — done. See `extract-canvas/src/tests/global-setup.ts`.
- [x] **Step 2: Verify file exists + build stays clean** — `dist/index.js` present after `npm run build`; no test/spec files leaked into `dist/`.

<details><summary>Reference implementation</summary>

- [ ] Original Step 1 code (for reference)

```ts
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HARNESS_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../../')
const PORT = 4321

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let server: any

export async function setup() {
  const distEntry = join(HARNESS_ROOT, 'dist/index.js')
  if (!existsSync(distEntry)) {
    throw new Error(
      `[global-setup] dist/index.js not found at ${distEntry}.\n` +
      `Run "npm run build" inside extract-canvas/ before running e2e tests.`
    )
  }

  await new Promise<void>((resolve, reject) => {
    server = createServer((req, res) => {
      const rawUrl = req.url ?? '/'
      const urlPath = rawUrl === '/' ? '/test-harness/index.html' : rawUrl.split('?')[0]
      const filePath = join(HARNESS_ROOT, urlPath)

      if (!existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end(`Not found: ${urlPath}`)
        return
      }

      const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': mime })
      res.end(readFileSync(filePath))
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
```

</details>

---

## Task 4: Create `vitest.e2e.config.ts` ✅

> Done. Note: `vitest list` reports "no test files found" for this config (a `list`-subcommand quirk in vitest 1.6.1); `vitest run` collects and runs the 11 tests correctly. No `environment` is set, so the runner defaults to `node` — correct, since Playwright drives a real browser.


**Files:**
- Create: `extract-canvas/vitest.e2e.config.ts`

Separate config so `npm test` (unit tests) is unaffected.

- [ ] **Step 1: Create the file**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    globalSetup: './src/tests/global-setup.ts',
    testTimeout: 45000,
    hookTimeout: 30000,
  },
})
```

- [ ] **Step 2: Verify file exists** — `ls extract-canvas/vitest.e2e.config.ts`

---

## Task 5: Update the test — new URL and simplified `openPage` ✅

**Files:**
- Modify: `extract-canvas/src/tests/template-editor.test.ts`

Two changes:
1. `EDITOR_URL` points at the local harness instead of Nuxt.
2. `openPage` drops the Nuxt 404 reload workaround (it's a plain static server now).

- [ ] **Step 1: Replace `EDITOR_URL` and `openPage`**

Old block (lines 13–31):
```ts
const EDITOR_URL = 'http://localhost:3000/manual/template-editor'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(EDITOR_URL)
  // Wait for Vue SPA to hydrate — either canvas or Nuxt 404 error page appears first
  await page.waitForFunction(
    () => document.querySelector('canvas') !== null || document.querySelector('.error-page') !== null,
    { timeout: 10000 },
  )
  // Nuxt SPA shows 404 on first nav to a newly-compiled route; one reload fixes it
  if ((await page.locator('.error-page').count()) > 0) {
    await page.reload({ waitUntil: 'networkidle' })
  }
  await page.waitForSelector('canvas', { timeout: 15000 })
  return page
}
```

Replace with:
```ts
const EDITOR_URL = 'http://localhost:4321/test-harness/'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(EDITOR_URL)
  await page.waitForSelector('canvas', { timeout: 15000 })
  return page
}
```

- [ ] **Step 2: Verify the change** — the test file is now excluded from the library `tsc` build (Task 3), so `npx tsc --noEmit` no longer type-checks it. Instead, the change is exercised directly by the e2e run in Task 7 (it's just string-constant + control-flow edits). Optionally type-check it standalone with the e2e config's transform, but running Task 7 is the real verification.

---

## Task 6: Update `package.json` ✅

**Files:**
- Modify: `extract-canvas/package.json`

- [ ] **Step 1: Add the e2e script** alongside the existing `test` script:

```json
"scripts": {
  "build": "tsc -p tsconfig.json",
  "test": "vitest run",
  "test:e2e": "npm run build && vitest run --config vitest.e2e.config.ts"
}
```

- [ ] **Step 2: Verify JSON is valid** — `node -e "require('./extract-canvas/package.json')" && echo "valid JSON"`

---

## Task 7: Run the e2e tests and fix failures ✅

**Outcome:** 11/11 e2e pass, 65/65 unit pass, no Nuxt. The actual failures hit during execution were **#2 (EISDIR on directory requests)** and **#3 (extensionless imports → esbuild bundling)** — both documented in the Findings section near the top. The anticipated fixes in the checklist below (canvas width, auto-load `onUpdate`, layer `dragend`, format resize) were **pre-empted** by decisions baked into Tasks 1–2, so none were needed at this stage. Kept below as a troubleshooting reference.

- [x] **Step 1: Run the e2e suite** — `npm run test:e2e` → build + 11/11 pass (~6s).

### Troubleshooting reference (anticipated failure modes — none triggered)

- [ ] **Step 2: Canvas never appears.** `.canvas-wrapper` reports 0 width in headless Chromium. `min-width: 400px` is already set in `index.html`; the `app.js` synchronous-boot fallback also covers this. If still failing, increase `min-width` or boot on `DOMContentLoaded`.

- [ ] **Step 3: Default template doesn't auto-load (test #2 fails).** `waitForJsonLength(page, 4)` times out → `onUpdate` wasn't called after `loadItems`. If `CanvasEditor.loadItems` doesn't itself invoke `onUpdate`, add an explicit call in `bootWithDefaultTemplate` after `loadItems`:
  ```js
  editor.loadItems(MOCK_TEMPLATES[0].structure)
  onUpdate(MOCK_TEMPLATES[0].structure)
  ```

- [ ] **Step 4: Layer drag-and-drop doesn't reorder (test #10 fails).** Playwright `dragTo` fires synthetic DnD events. Confirm `.layer-item` has `draggable="true"`. If `dragend` fires on `document` rather than the container, add a document-level fallback inside `setupLayerDnd`:
  ```js
  document.addEventListener('dragend', () => {
    if (!dragSrc) return
    dragSrc.classList.remove('dragging')
    dragSrc = null
    const order = [...container.querySelectorAll('.layer-item')].map(el => el.dataset.unique)
    editor?.setLayerOrder(order)
  })
  ```

- [ ] **Step 5: Format change doesn't resize canvas (test #11 fails).** The test measures `canvas.boundingBox().height` before/after. The `formatSelect` handler updates `canvasWrap.style.aspectRatio`; verify `CanvasEditor.setDimensions()` also updates the canvas element's `width`/`height` attributes so the box reflects the new ratio.

- [x] **Step 6: Confirm unit tests still pass** — `npm test` → 65/65 passing.

- [ ] **Step 7: Commit** (not yet done — awaiting user go-ahead). Suggested set:

```bash
git add extract-canvas/test-harness/ extract-canvas/src/tests/global-setup.ts \
        extract-canvas/vitest.e2e.config.ts extract-canvas/src/tests/template-editor.test.ts \
        extract-canvas/package.json extract-canvas/tsconfig.json
git commit -m "feat(extract-canvas): standalone e2e test harness — no Nuxt dependency"
```

---

## Verification

```bash
# From extract-canvas/ — no Nuxt server needed
cd extract-canvas
npm run test:e2e   # expect 11/11 Playwright tests pass
npm test           # expect 65/65 unit tests pass

# Manual browser check (optional)
npm run build && npx serve . --listen 4321
# Open http://localhost:4321/test-harness/ — canvas loads with the Two Column template
```
