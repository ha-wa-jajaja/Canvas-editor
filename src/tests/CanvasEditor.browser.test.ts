/**
 * Real-browser interaction tests for CanvasEditor.
 *
 * These replace the old Playwright + static-harness "e2e" suite. Instead of
 * booting an HTTP server and driving a replica demo page, we mount the editor
 * directly onto a real <canvas> in a headless Chromium (Playwright provider).
 *
 * What this tier proves that the happy-dom *.spec.ts unit tests cannot:
 *   1. The full _draw() path runs against a REAL CanvasRenderingContext2D
 *      (happy-dom mocks the context, so drawShape/drawAnchors/drawDeleteBtn are
 *      never actually exercised).
 *   2. The real offsetX/offsetY coordinate pipeline — events carry only
 *      clientX/clientY and the browser derives offsetX/offsetY from the canvas's
 *      actual layout box, exactly as in production.
 *
 * Native HTML5 drag-and-drop (sidebar component drop, layer-row reordering) and
 * the CSS aspect-ratio wrapper lived in the Vue page / vanilla harness, not in
 * this library — their library entry points (addDroppedItem, setLayerOrder,
 * setDimensions) are covered by CanvasEditor.spec.ts.
 *
 * Run:  npm run test:browser
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CanvasEditor, createUniqueId } from '../index'
import type { CanvasNode } from '../types'

// ─── Source-item adapter (mirrors the real consumer: TemplateEditor.vue) ───────

interface SourceItem {
  type: string
  x_min: number
  y_min: number
  x_max: number
  y_max: number
  priority: number
}

const adapter = {
  fromItem: (a: SourceItem): CanvasNode => ({
    x: a.x_min,
    y: a.y_min,
    width: a.x_max - a.x_min,
    height: a.y_max - a.y_min,
    type: a.type,
    priority: a.priority,
    unique: createUniqueId(a.type, a.x_min, a.y_min, a.priority),
  }),
  toItem: (node: CanvasNode, source: SourceItem): SourceItem => ({
    ...source,
    x_min: node.x,
    y_min: node.y,
    x_max: node.x + node.width,
    y_max: node.y + node.height,
    priority: node.priority,
  }),
  createItem: (node: CanvasNode): SourceItem => ({
    type: node.type,
    x_min: node.x,
    y_min: node.y,
    x_max: node.x + node.width,
    y_max: node.y + node.height,
    priority: node.priority,
  }),
}

// Single product node. Source 1000×1000, container 600 → scale 0.6.
//   source (200,200)→(500,500)  ⇒  canvas (120,120) size 180×180
const PRODUCT: SourceItem = {
  type: 'product',
  x_min: 200,
  y_min: 200,
  x_max: 500,
  y_max: 500,
  priority: 0,
}

const CONTAINER_W = 600
const SOURCE = { width: 1000, height: 1000 }

// Canvas-space landmarks for the product node above (anchor scale = 1):
const NODE_CENTER = { x: 210, y: 210 }
const DELETE_BTN = { x: 270, y: 150 } // x = 120+180-30, y = 120+30
const BR_ANCHOR = { x: 290, y: 290 } // inside the bottom-right corner hit box

// ─── Test fixtures ─────────────────────────────────────────────────────────────

let container: HTMLDivElement
let canvas: HTMLCanvasElement
let editor: CanvasEditor<SourceItem>
let updates: SourceItem[][]
let layers: CanvasNode[][]

function mount(items: SourceItem[] = [PRODUCT]) {
  container = document.createElement('div')
  canvas = document.createElement('canvas')
  container.appendChild(canvas)
  document.body.appendChild(container)

  updates = []
  layers = []

  editor = new CanvasEditor<SourceItem>({
    canvas,
    dimensions: SOURCE,
    adapter,
    onUpdate: (items) => updates.push(items),
    onLayersChange: (nodes) => layers.push(nodes),
  })
  editor.setContainerWidth(CONTAINER_W)

  // Pin the CSS display size to the drawing-buffer size so offsetX/offsetY map
  // 1:1 to canvas coordinates (a fresh canvas already does this, but be explicit).
  canvas.style.width = `${canvas.width}px`
  canvas.style.height = `${canvas.height}px`

  editor.loadItems(items)
}

function teardown() {
  editor.destroy()
  container.remove()
}

// Re-mount with a different item set inside a test (cleans the beforeEach mount).
function remount(items: SourceItem[]) {
  teardown()
  mount(items)
}

// Dispatch a real MouseEvent at a canvas-space point. The browser computes
// offsetX/offsetY from clientX/clientY and the canvas's layout box.
function fire(type: string, pt: { x: number; y: number }) {
  const r = canvas.getBoundingClientRect()
  const scaleX = r.width / canvas.width
  const scaleY = r.height / canvas.height
  canvas.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: r.left + pt.x * scaleX,
      clientY: r.top + pt.y * scaleY,
    })
  )
}

function mouseUp() {
  window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

function selectNode() {
  fire('mousemove', NODE_CENTER)
  fire('mousedown', NODE_CENTER)
}

const lastUpdate = () => updates[updates.length - 1]

beforeEach(() => {
  mount()
})

afterEach(() => {
  teardown()
})

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('CanvasEditor – real browser interaction', () => {
  it('mounts and draws on a real 2D context, emitting initial layers', () => {
    // A real getContext('2d') (not a mock) is used; loadItems ran _draw without
    // throwing and emitted the layer set.
    expect(canvas.getContext('2d')).toBeInstanceOf(CanvasRenderingContext2D)
    expect(layers.at(-1)).toHaveLength(1)
    expect(layers.at(-1)![0].type).toBe('product')
  })

  it('selects a node on a real click (fires onLayersChange)', () => {
    const before = layers.length
    selectNode()
    expect(layers.length).toBeGreaterThan(before)
  })

  it('dragging a node updates its source coordinates', () => {
    selectNode()
    fire('mousemove', { x: NODE_CENTER.x + 50, y: NODE_CENTER.y + 50 })
    mouseUp()

    const after = lastUpdate()
    expect(after).toHaveLength(1)
    // Original source x_min/y_min were 200; a 50px canvas drag shifts them.
    expect(Math.abs(after[0].x_min - PRODUCT.x_min)).toBeGreaterThan(0.5)
    expect(Math.abs(after[0].y_min - PRODUCT.y_min)).toBeGreaterThan(0.5)
  })

  it('resizing via the bottom-right anchor changes dimensions', () => {
    selectNode()
    mouseUp() // finish selection so the next move hit-tests the anchor

    fire('mousemove', BR_ANCHOR) // arms activeAnchor = 'bottom-right'
    fire('mousedown', BR_ANCHOR)
    fire('mousemove', { x: BR_ANCHOR.x + 50, y: BR_ANCHOR.y + 50 })
    mouseUp()

    const after = lastUpdate()
    expect(after).toHaveLength(1)
    expect(Math.abs(after[0].x_max - PRODUCT.x_max)).toBeGreaterThan(0.5)
    expect(Math.abs(after[0].y_max - PRODUCT.y_max)).toBeGreaterThan(0.5)
  })

  it('clicking the delete button removes the active node', () => {
    selectNode()
    mouseUp()

    fire('mousemove', DELETE_BTN) // marks onDeleteButton = true
    fire('mousedown', DELETE_BTN)

    expect(lastUpdate()).toHaveLength(0)
    expect(layers.at(-1)).toHaveLength(0)
  })

  // ── Gesture: drop ──────────────────────────────────────────────────────────
  // The library does not bind a drop listener — translating a drop event into
  // addDroppedItem() is the consumer's job. We wire a representative handler (as
  // any consumer would) and drive a REAL HTML5 drop, proving the gesture →
  // offset → source-coordinate → output pipeline end to end.
  it('a real drop event adds an item at the correct source position', () => {
    remount([]) // start from a blank canvas

    canvas.addEventListener('dragover', (e) => e.preventDefault())
    canvas.addEventListener('drop', (e) => {
      e.preventDefault()
      editor.addDroppedItem({
        x: e.offsetX,
        y: e.offsetY,
        type: 'logo',
        widthPercentage: 30,
        heightPercentage: 20,
        priority: 0,
      })
    })

    const r = canvas.getBoundingClientRect()
    canvas.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: r.left + 300 * (r.width / canvas.width),
        clientY: r.top + 300 * (r.height / canvas.height),
        dataTransfer: new DataTransfer(),
      })
    )

    const dropped = lastUpdate().find((i) => i.type === 'logo')
    expect(dropped).toBeDefined()
    // Dropped at canvas (300,300); canvas is 600px for a 1000px source → (500,500)
    expect(dropped!.x_min).toBeCloseTo(500, 0)
    expect(dropped!.y_min).toBeCloseTo(500, 0)
  })

  // ── Gesture: layer reorder ───────────────────────────────────────────────────
  // Reordering itself is setLayerOrder(); the row-drag gesture is consumer glue.
  // We build a layer panel and wire it like a consumer, then drive a REAL drag
  // of one row past another and assert the emitted output order + priorities.
  it('a real layer-row drag reorders the emitted items', () => {
    const A: SourceItem = {
      type: 'product',
      x_min: 50,
      y_min: 50,
      x_max: 450,
      y_max: 450,
      priority: 0,
    }
    const B: SourceItem = {
      type: 'logo',
      x_min: 550,
      y_min: 550,
      x_max: 950,
      y_max: 950,
      priority: 1,
    }
    remount([A, B])

    // Build the panel from the editor's layer snapshot (priority-desc → [B, A]).
    const panel = document.createElement('div')
    container.appendChild(panel)
    for (const node of layers.at(-1)!) {
      const row = document.createElement('div')
      row.className = 'layer-item'
      row.draggable = true
      row.dataset.unique = node.unique
      row.textContent = node.type
      row.style.height = '24px'
      panel.appendChild(row)
    }

    // Consumer-style reorder wiring (mirrors the reference harness).
    let dragSrc: HTMLElement | null = null
    panel.addEventListener('dragstart', (e) => {
      dragSrc = (e.target as HTMLElement).closest('.layer-item')
    })
    panel.addEventListener('dragover', (e) => {
      e.preventDefault()
      const target = (e.target as HTMLElement).closest('.layer-item')
      if (!target || target === dragSrc || !dragSrc) return
      const rect = target.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      panel.insertBefore(dragSrc, e.clientY < mid ? target : target.nextSibling)
    })
    panel.addEventListener('dragend', () => {
      if (!dragSrc) return
      dragSrc = null
      const order = [...panel.querySelectorAll<HTMLElement>('.layer-item')].map(
        (el) => el.dataset.unique!
      )
      editor.setLayerOrder(order)
    })

    const rows = panel.querySelectorAll<HTMLElement>('.layer-item')
    const dt = new DataTransfer()
    const targetRect = rows[1].getBoundingClientRect()

    // Drag the first row (logo) below the second (product).
    rows[0].dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, dataTransfer: dt })
    )
    rows[1].dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: targetRect.left + 5,
        clientY: targetRect.bottom - 2, // below midpoint → insert after
      })
    )
    rows[0].dispatchEvent(
      new DragEvent('dragend', { bubbles: true, dataTransfer: dt })
    )

    const emitted = lastUpdate()
    // Order flipped from [logo, product] to [product, logo]...
    expect(emitted.map((i) => i.type)).toEqual(['product', 'logo'])
    // ...and priorities reassigned top-down (index 0 = topmost = highest).
    expect(emitted.find((i) => i.type === 'product')!.priority).toBe(1)
    expect(emitted.find((i) => i.type === 'logo')!.priority).toBe(0)
  })
})
