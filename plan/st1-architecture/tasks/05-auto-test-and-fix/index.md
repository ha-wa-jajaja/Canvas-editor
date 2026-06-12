# Task 05: Auto-Test and Fix

## Objective

Run the e2e browser integration tests written in Task 04, diagnose failures, and fix them until all tests pass.

---

## What Was Implemented in Task 04

### Unit tests (all passing — 65 tests)

Run from the `extract-canvas/` sub-package:

```bash
cd extract-canvas
npm test
```

| File                                           | Coverage                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `extract-canvas/src/utils/coordinates.spec.ts` | Round-trip conversion, multiple dimension pairs, float tolerance            |
| `extract-canvas/src/utils/constraints.spec.ts` | min/max clamping, resize delta for all 4 edges, EL_MIN_SIZE boundary        |
| `extract-canvas/src/utils/anchors.spec.ts`     | Anchor scale, hit detection for full and small nodes, non-overlap invariant |
| `extract-canvas/src/CanvasEditor.spec.ts`      | Selection, drag, resize, delete, layer callback, update callback shape      |

Vitest config for the package: `extract-canvas/vitest.config.ts`

- environment: `happy-dom`
- include: `src/**/*.spec.ts`

---

### E2E browser tests (FAILING — first test failed)

**File:** `extract-canvas/src/tests/template-editor.test.ts`

**How to run** (from the project root `/Users/stock1/Desktop/one-design-frontend`):

```bash
# Step 1 — start the dev server in one terminal
npm run dev

# Step 2 — run e2e tests in another terminal
npx vitest run extract-canvas/src/tests/template-editor.test.ts
```

The tests are picked up by the root vitest config (`vitest.config.mts`) which includes `extract-canvas/src/tests/**/*.test.ts`.

**Tech stack used:** raw `playwright` (not `@nuxt/test-utils/e2e` — that caused a `TypeError: The URL must be of scheme file` due to the root vitest config setting `root: '.vitest'`).

**Playwright version:** 1.46.1  
**Chromium binary:** present at `/Users/stock1/Library/Caches/ms-playwright/chromium-1129`

---

## Tests and What They Verify

| #   | Test name                              | What it checks                                |
| --- | -------------------------------------- | --------------------------------------------- |
| 1   | renders the canvas on load             | `canvas` element is visible after navigation  |
| 2   | auto-loads Two Column with 4 items     | JSON output `pre` has 4 items on mount        |
| 3   | loads Top Product template (3 items)   | dropdown + Load button → 3 items              |
| 4   | loads Full Screen + Title (3 items)    | dropdown + Load button → 3 items              |
| 5   | loads blank canvas (0 items)           | select null → Load → 0 items                  |
| 6   | dropping a component adds an item      | HTML5 drag from sidebar → JSON grows          |
| 7   | dragging a node changes coordinates    | mouse drag on canvas → `x_min`/`y_min` change |
| 8   | resizing via anchor changes dimensions | anchor drag → `x_max`/`y_max` change          |
| 9   | delete button removes active item      | click delete → JSON shrinks by 1              |
| 10  | reorder layers changes panel order     | drag layer row → panel reorders               |
| 11  | changing format rescales canvas height | format select → canvas height changes         |

---

## Known Failure: First Test Failed

The test suite ran but **test #1 ("renders the canvas on load") failed**.  
No further error detail was captured. The most likely causes, in order of probability:

### 1. Dev server not running (most likely)

`openPage()` does `page.goto('http://localhost:3000/manual/template-editor')`. If the server is not up, `goto` will throw a connection-refused error.

**Check:** confirm `npm run dev` is running and the page loads at `http://localhost:3000/manual/template-editor` in a normal browser before running tests.

### 2. Canvas element never appears (`v-if="wrapW > 0"`)

In `components/Template/TemplateEditor.vue`, the canvas is behind:

```html
<canvas v-if="wrapW > 0" ...></canvas>
```

where `wrapW` comes from `useElementSize(canvasWrap)` (a `ResizeObserver`-based composable). In a headless Chromium the `ResizeObserver` fires, but the element may report `width: 0` if CSS hasn't been evaluated yet.

`openPage()` waits for `'canvas'` selector with a 15-second timeout. If `wrapW` never goes above 0, this wait will time out and the test throws before the `isVisible()` assertion.

**Fix options:**

- Wait for `'.canvas-wrapper canvas'` specifically with a longer timeout.
- Add a `page.waitForFunction` polling for `wrapW > 0` via the canvas element being present _and_ having non-zero width.
- Alternatively: add a `data-testid="canvas"` attribute to the canvas element unconditionally (remove the `v-if` on the attribute, keep the logic inside), so the selector always resolves.

### 3. Wrong Playwright binary version mismatch

The installed `playwright` package is **1.46.1** which wants `chromium-1129`. That binary is confirmed present at `/Users/stock1/Library/Caches/ms-playwright/chromium-1129`. However, if the test runner resolves a different `playwright` version (e.g. from `@nuxt/test-utils`'s own dependency), there could be a version mismatch.

**Check:** run `node -e "const {chromium} = require('playwright'); chromium.launch().then(b => { console.log('ok'); b.close(); })"` from the project root to confirm Chromium launches correctly standalone.

### 4. Navigation route doesn't exist

`/manual/template-editor` requires the Nuxt server to have the `pages/manual/template-editor.vue` page compiled and served. Confirm the route loads in a regular browser first.

---

## How to Reproduce and Isolate the Failure

```bash
# 1. Make sure the server is running
npm run dev

# 2. Run only the first test to see the raw error
npx vitest run extract-canvas/src/tests/template-editor.test.ts -t "renders the canvas"

# 3. Run with headed browser to see what's happening visually
# (edit the test temporarily: chromium.launch({ headless: false }))
```

Alternatively, debug the canvas visibility issue standalone:

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/manual/template-editor');
  const canvas = await page.waitForSelector('canvas', { timeout: 15000 });
  console.log('canvas found:', !!canvas);
  const visible = await canvas.isVisible();
  console.log('visible:', visible);
  await browser.close();
})();
"
```

---

## Files to Edit

| File                                               | Purpose                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `extract-canvas/src/tests/template-editor.test.ts` | The e2e test file — fix assertions, selectors, or timing as needed                                    |
| `components/Template/TemplateEditor.vue`           | If the `v-if="wrapW > 0"` canvas guard is the problem, consider adding `data-testid` or restructuring |

---

## Acceptance Criteria

- All 11 e2e tests pass with `npm run dev` running in another terminal
- Unit tests (`npm test` from `extract-canvas/`) continue to pass (65 tests)
- No changes to production logic except small testability hooks if clearly justified
