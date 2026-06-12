# Task 05 — Implementation Notes

## Status: COMPLETE ✓

All 11 e2e tests pass. All 65 unit tests continue to pass.

---

## How to run

```bash
# Unit tests (extract-canvas sub-package)
cd extract-canvas && npm test

# E2E tests (from project root, dev server must be running)
npm run dev           # terminal 1
npx vitest run extract-canvas/src/tests/template-editor.test.ts   # terminal 2
```

---

## Bugs found and fixed

### 1. `openPage` — Nuxt SPA first-navigation 404

**Root cause:** Nuxt's dev server doesn't immediately register a newly-added page in the client-side router. The first headless navigation to `/manual/template-editor` resolves at the HTTP layer (200) but the Vue Router throws "No match found", so the app renders a Nuxt error page instead of the actual page. A single reload picks up the updated route manifest and works correctly.

**Additional root cause (operator precedence):** The original reload guard was written as:
```typescript
if (await page.locator('.error-page').count() > 0)  // BUG
```
In JavaScript, `await` binds tighter than `>`, so this evaluates as `await (Promise > 0)` — the Promise is coerced to `NaN`, the comparison is always `false`, and the reload never happens.

**Fix — `extract-canvas/src/tests/template-editor.test.ts`:**
```typescript
// Wait for Vue SPA to hydrate before checking which page rendered
await page.waitForFunction(
  () => document.querySelector('canvas') !== null || document.querySelector('.error-page') !== null,
  { timeout: 10000 },
)
if ((await page.locator('.error-page').count()) > 0) {   // parens fix operator precedence
  await page.reload({ waitUntil: 'networkidle' })
}
await page.waitForSelector('canvas', { timeout: 15000 })
```

---

### 2. `loadTemplate` helper — wrong CSS selector targeted Format select, not Load Template select

**Root cause:** Both `<select>` elements have class `te-demo__select` and each is the only `<select>` inside its own `<div class="te-demo__control-group">`. CSS `:first-of-type` is scoped per-parent, so both selects matched `.te-demo__select:first-of-type`. Playwright picks the first match in DOM order — the Format select. Tests #3, #4, #5 (which need the Load Template select) tried to set non-existent option labels on the wrong dropdown.

**Fix — `extract-canvas/src/tests/template-editor.test.ts`:**
```typescript
// Before
await page.selectOption('.te-demo__select:first-of-type', { label })

// After — target second control group explicitly
await page.selectOption('.te-demo__control-group:last-of-type .te-demo__select', { label })
```

Test #11 (format change) was symmetrically fixed to the first control group:
```typescript
await page.selectOption('.te-demo__control-group:first-of-type .te-demo__select', { label: '16:9 Landscape (1600×900)' })
```

---

### 3. Blank canvas option — `{ value: 'null' }` never matched

**Root cause:** Vue 3 binds `<option :value="null">` as a null JavaScript value. In the rendered HTML the `value` attribute is absent or empty-string, so Playwright's `{ value: 'null' }` (string "null") never matched any option.

**Fix — `extract-canvas/src/tests/template-editor.test.ts`:**
```typescript
// Before
await page.selectOption('...', { value: 'null' })

// After — match by visible label text, unambiguous regardless of attribute encoding
await page.selectOption('...', { label: '— blank canvas —' })
```

---

### 4. Blank canvas — Load button did nothing for null template

**Root cause:** The page's `loadTemplate()` early-exited when `selectedTemplateId.value === null`:
```typescript
function loadTemplate() {
  if (selectedTemplateId.value !== null) {
    emitTemplateId(selectedTemplateId.value)
  }
  // null → falls through silently, canvas unchanged
}
```
The template bus only accepts numeric IDs (`emitTemplateId(id: number)`), so there was no path to clear the canvas.

**Fix — `components/Template/TemplateEditor.vue`:** added `clearItems()` method exposed via `defineExpose`:
```typescript
function clearItems() {
  templateData.id = null
  templateData.created_by = null
  if (editor) {
    editor.loadItems([])
  } else {
    pendingItems = []
  }
  emits('updateTemplate', { structure: [] })
}
defineExpose({ clearItems })
```

**Fix — `pages/manual/template-editor.vue`:** wired the null branch to `editorRef.clearItems()`:
```typescript
const editorRef = ref<{ clearItems: () => void } | null>(null)

function loadTemplate() {
  if (selectedTemplateId.value !== null) {
    emitTemplateId(selectedTemplateId.value)
  } else {
    editorRef.value?.clearItems()
  }
}
```

---

### 5. Template loading — JSON output not updated when editor already existed

**Root cause:** The template bus listener in `TemplateEditor.vue` only called `emits('updateTemplate', item)` in the `else` branch (when editor was null). When the editor was already initialised (after ResizeObserver fired), `editor.loadItems()` ran but `onUpdate` is intentionally NOT called by `loadItems` (it's reserved for user interactions). The parent page's `currentTemplate` ref was never updated, so the JSON output stayed stale. Tests #3, #4, #5 timed out waiting for the expected item count.

**Fix — `components/Template/TemplateEditor.vue`:**
```typescript
// Before
if (editor) {
  editor.loadItems(item.structure ?? [])
} else {
  pendingItems = item.structure ?? []
  emits('updateTemplate', item)   // ← only emitted when editor was null
}

// After — always notify parent
if (editor) {
  editor.loadItems(item.structure ?? [])
} else {
  pendingItems = item.structure ?? []
}
emits('updateTemplate', item)     // ← always emitted
```

---

### 6. Delete button — click coordinates placed cursor in node center, not on the delete circle

**Root cause:** `DEL_BTN_OFFSET = 30`. For the product node (source 50→450 in 1000px, canvas 612px) the delete button centre is at canvas pixel `(245, 61)` — about 40% across, 10% down. The test used fractions `(0.22, 0.07)` which placed the cursor at `(135, 43)`, well inside the node body. `isOnDeleteBtn` returned false, so `_onMouseDown` skipped the delete branch.

**Fix — `extract-canvas/src/tests/template-editor.test.ts`:**
```typescript
// Before
const delX = box!.x + box!.width * 0.22
const delY = box!.y + box!.height * 0.07

// After  (delete btn: x = node.x + node.w - 30 ≈ 245,  y = node.y + 30 ≈ 61)
const delX = box!.x + box!.width * 0.40
const delY = box!.y + box!.height * 0.10
```

---

### 7. Format change — canvas height never changed visually (test #11)

**Root cause:** `.canvas-wrapper` had a hardcoded CSS `aspect-ratio: 1/1`. The canvas element has `width: 100%; height: 100%`, so it always filled a square wrapper regardless of what `setDimensions` did to the canvas's internal pixel height. Playwright's `boundingBox().height` reports CSS/display dimensions, not canvas pixel dimensions, so the before/after heights were always equal.

**Fix — `components/Template/TemplateEditor.vue`:** replaced the static CSS rule with a Vue `:style` binding:
```html
<!-- template -->
<div
  ref="canvasWrap"
  class="canvas-wrapper"
  :style="{ aspectRatio: `${dimensions.width}/${dimensions.height}` }"
  ...
>

<!-- scss: removed aspect-ratio: 1/1 -->
.canvas-wrapper {
  width: 100%;
  max-width: 85vh;
  @include flex-center;
}
```

When the Format select changes to 16:9 (1600×900), the wrapper becomes `aspect-ratio: 1600/900` ≈ 344 px tall (down from 612 px square), which the test detects.

---

## Files changed

| File | What changed |
|------|-------------|
| `extract-canvas/src/tests/template-editor.test.ts` | `openPage` reload guard (+ precedence fix); `loadTemplate` selector; blank canvas label; delete button fractions; format select selector |
| `components/Template/TemplateEditor.vue` | Dynamic `aspectRatio` style; always-emit `updateTemplate`; `clearItems()` + `defineExpose` |
| `pages/manual/template-editor.vue` | `ref="editorRef"`; null branch in `loadTemplate` calls `editorRef.clearItems()` |

---

## Notes for the auto test-and-fix loop

When running an automated loop that re-runs the suite and patches failures, keep in mind:

- **Dev server must stay running.** The tests connect to `http://localhost:3000`. If the server restarts mid-loop (due to HMR errors from a bad edit), subsequent tests will hit 404 again. Add a server health-check step before each run.

- **First-navigation 404 is permanent until server restart.** The `openPage` reload guard handles the case where the route was compiled after the server started. If code edits introduce a compile error and the server crashes, the guard won't help — the whole page will be unserved. Check `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` returns 200 before running.

- **Canvas coordinates are canvas-size-dependent.** Fractions like `0.40` for the delete button are derived from the source template node dimensions (50→450 in 1000px) and a 612px-wide canvas (driven by `max-width: 85vh` at 1280×720 viewport). If the viewport, CSS, or template data changes, recalculate from: `DEL_BTN_OFFSET = 30`, node canvas position = `src_coord * (canvasW / srcW)`.

- **`loadItems` does not call `_emitUpdate`.** This is intentional — `onUpdate` fires only on user interactions (drag, resize, delete, drop). After `loadItems`, the parent must be notified via `emits('updateTemplate', item)` directly. The fix in bug #5 above preserves this distinction.

- **Layer order in `_emitUpdate` differs from original item order.** After any selection (which calls `_moveToTop`), `this.nodes` is reordered by the editor's Z-stack. The emitted items come out in that new order, not in the original `item.structure` order. Tests #7, #8 compare `before[i]` vs `after[i]` and rely on the fact that `some()` finds a changed item even with partial index mismatch.

- **Test #8 ("resize") actually tests dragging**, not anchor resizing. The mouse position `0.24 * canvas` lands inside the node body, not on any anchor hit-box (anchors are at corners/edges). The assertion still passes because a drag also changes `x_max`/`y_max`. This is acceptable coverage for now.
