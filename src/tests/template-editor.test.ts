/**
 * Browser integration tests for /manual/template-editor.
 *
 * Prerequisites: Nuxt dev server must be running on port 3000.
 *   npm run dev
 *
 * Run:
 *   npx vitest run extract-canvas/src/tests/template-editor.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'

const EDITOR_URL = 'http://localhost:4321/test-harness/'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(EDITOR_URL)
  await page.waitForSelector('canvas', { timeout: 15000 })
  return page
}

async function readJson(page: Page): Promise<unknown[]> {
  const text = await page
    .locator('.te-demo__output pre')
    .textContent({ timeout: 5000 })
  try {
    return JSON.parse(text ?? '[]')
  } catch {
    return []
  }
}

async function waitForJsonLength(page: Page, expected: number, timeout = 8000) {
  await page.waitForFunction(
    (len: number) => {
      const pre = document.querySelector('.te-demo__output pre')
      try {
        return JSON.parse(pre?.textContent ?? '[]').length === len
      } catch {
        return false
      }
    },
    expected,
    { timeout }
  )
}

async function loadTemplate(page: Page, label: string) {
  await page.selectOption(
    '.te-demo__control-group:last-of-type .te-demo__select',
    { label }
  )
  await page.click('button.te-demo__btn')
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Template Editor – browser integration', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch()
  }, 30000)

  afterAll(async () => {
    await browser?.close()
  })

  // ── Page load ────────────────────────────────────────────────────────────────

  it('renders the canvas on load', async () => {
    const page = await openPage(browser)
    expect(await page.locator('canvas').first().isVisible()).toBe(true)
    await page.close()
  }, 30000)

  // ── Template loading ──────────────────────────────────────────────────────────

  it('auto-loads the default template (Two Column) with 4 items', async () => {
    const page = await openPage(browser)
    await waitForJsonLength(page, 4)
    expect(await readJson(page)).toHaveLength(4)
    await page.close()
  }, 30000)

  it('loads Top Product template (3 items)', async () => {
    const page = await openPage(browser)
    await loadTemplate(page, 'Top Product')
    await waitForJsonLength(page, 3)
    expect(await readJson(page)).toHaveLength(3)
    await page.close()
  }, 30000)

  it('loads Full Screen + Title template (3 items)', async () => {
    const page = await openPage(browser)
    await loadTemplate(page, 'Full Screen + Title')
    await waitForJsonLength(page, 3)
    expect(await readJson(page)).toHaveLength(3)
    await page.close()
  }, 30000)

  it('loads blank canvas (0 items)', async () => {
    const page = await openPage(browser)
    await page.selectOption(
      '.te-demo__control-group:last-of-type .te-demo__select',
      { label: '— blank canvas —' }
    )
    await page.click('button.te-demo__btn')
    await waitForJsonLength(page, 0)
    expect(await readJson(page)).toHaveLength(0)
    await page.close()
  }, 30000)

  // ── Drop component ────────────────────────────────────────────────────────────

  it('dropping a component onto the canvas adds an item to the JSON', async () => {
    const page = await openPage(browser)
    await page.selectOption(
      '.te-demo__control-group:last-of-type .te-demo__select',
      { label: '— blank canvas —' }
    )
    await page.click('button.te-demo__btn')
    await waitForJsonLength(page, 0)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    const comp = page.locator('.te-demo__comp-item').first()
    await comp.dragTo(canvas, {
      targetPosition: {
        x: Math.round(box!.width / 2),
        y: Math.round(box!.height / 2),
      },
    })

    await waitForJsonLength(page, 1)
    expect(await readJson(page)).toHaveLength(1)
    await page.close()
  }, 45000)

  // ── Drag ─────────────────────────────────────────────────────────────────────

  it('dragging a node changes its coordinates in the JSON output', async () => {
    const page = await openPage(browser)
    await waitForJsonLength(page, 4)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    const before = (await readJson(page)) as Array<{
      x_min: number
      y_min: number
    }>

    // Click top-left area to select first element, then drag
    const cx = box!.x + box!.width * 0.15
    const cy = box!.y + box!.height * 0.15
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 50, cy + 50, { steps: 15 })
    await page.mouse.up()

    // Wait for Vue reactivity to flush the JSON output
    await page.waitForFunction(
      () => {
        const pre = document.querySelector('.te-demo__output pre')
        return (pre?.textContent ?? '').length > 2
      },
      { timeout: 5000 }
    )
    await page.waitForTimeout(300)

    const after = (await readJson(page)) as Array<{
      x_min: number
      y_min: number
    }>
    const shifted = before.some((b, i) => {
      const a = after[i]
      return (
        a &&
        (Math.abs(a.x_min - b.x_min) > 0.5 || Math.abs(a.y_min - b.y_min) > 0.5)
      )
    })
    expect(shifted).toBe(true)
    await page.close()
  }, 45000)

  // ── Resize ────────────────────────────────────────────────────────────────────

  it('resizing via an anchor updates item dimensions in the JSON output', async () => {
    const page = await openPage(browser)
    await waitForJsonLength(page, 4)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Select a node
    const cx = box!.x + box!.width * 0.15
    const cy = box!.y + box!.height * 0.15
    await page.mouse.click(cx, cy)
    await page.waitForTimeout(200)

    const before = (await readJson(page)) as Array<{
      x_max: number
      y_max: number
    }>

    // Hover over approximate bottom-right anchor of the selected element, then drag
    const anchorX = box!.x + box!.width * 0.24
    const anchorY = box!.y + box!.height * 0.24
    await page.mouse.move(anchorX, anchorY)
    await page.mouse.down()
    await page.mouse.move(anchorX + 40, anchorY + 40, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(400)

    const after = (await readJson(page)) as Array<{
      x_max: number
      y_max: number
    }>
    const resized = before.some((b, i) => {
      const a = after[i]
      return (
        a &&
        (Math.abs(a.x_max - b.x_max) > 0.5 || Math.abs(a.y_max - b.y_max) > 0.5)
      )
    })
    expect(resized).toBe(true)
    await page.close()
  }, 45000)

  // ── Delete ────────────────────────────────────────────────────────────────────

  it('clicking the delete button removes the active item', async () => {
    const page = await openPage(browser)
    await waitForJsonLength(page, 4)

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Select first node (top-left product area of Two Column template)
    const cx = box!.x + box!.width * 0.15
    const cy = box!.y + box!.height * 0.15
    await page.mouse.click(cx, cy)
    await page.waitForTimeout(200)

    // Delete button: x = node.x + node.width - DEL_BTN_OFFSET, y = node.y + DEL_BTN_OFFSET
    // For product node (50→450 in 1000px src, canvas=612): x≈245, y≈61 → fractions ~0.40, ~0.10
    const delX = box!.x + box!.width * 0.4
    const delY = box!.y + box!.height * 0.1
    await page.mouse.move(delX, delY)
    await page.mouse.click(delX, delY)

    await waitForJsonLength(page, 3)
    expect(await readJson(page)).toHaveLength(3)
    await page.close()
  }, 45000)

  // ── Layer reorder ─────────────────────────────────────────────────────────────

  it('reordering layers changes the layer panel order', async () => {
    const page = await openPage(browser)
    await waitForJsonLength(page, 4)

    // Open Layers tab
    await page.click('button.te-demo__tab:nth-child(2)')
    await page.waitForTimeout(300)

    const items = page.locator('.layer-item')
    expect(await items.count()).toBe(4)
    const textsBefore = await items.allTextContents()

    // Drag first item past the second
    await items.nth(0).dragTo(items.nth(2))
    await page.waitForTimeout(400)

    const textsAfter = await items.allTextContents()
    expect(textsAfter).not.toEqual(textsBefore)
    await page.close()
  }, 45000)

  // ── Proportional rescaling ────────────────────────────────────────────────────

  it('changing canvas format rescales the canvas height proportionally', async () => {
    const page = await openPage(browser)
    await waitForJsonLength(page, 4)

    const heightBefore = (await page.locator('canvas').first().boundingBox())!
      .height

    // Switch from 1:1 square to 16:9 landscape
    await page.selectOption(
      '.te-demo__control-group:first-of-type .te-demo__select',
      { label: '16:9 Landscape (1600×900)' }
    )
    await page.waitForTimeout(800)

    const heightAfter = (await page.locator('canvas').first().boundingBox())!
      .height
    expect(Math.abs(heightAfter - heightBefore)).toBeGreaterThan(5)
    await page.close()
  }, 45000)
})
