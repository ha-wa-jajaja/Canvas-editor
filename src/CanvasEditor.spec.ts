import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CanvasEditor } from './CanvasEditor'
import type { CanvasNode, CanvasDropPayload } from './types'
import { DEL_BTN_OFFSET } from './constants'

// ─── Canvas / context helpers ─────────────────────────────────────────────────

function makeMockCtx() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  }
}

function makeCanvas(width = 400, height = 400) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = makeMockCtx()
  vi.spyOn(canvas, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D
  )
  return { canvas, ctx }
}

function fireMouseEvent(
  target: EventTarget,
  type: string,
  offsetX = 0,
  offsetY = 0
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'offsetX', { value: offsetX })
  Object.defineProperty(event, 'offsetY', { value: offsetY })
  target.dispatchEvent(event)
}

function mouseUp() {
  window.dispatchEvent(new MouseEvent('mouseup'))
}

// ─── Shared node factory ──────────────────────────────────────────────────────

// Source dimensions 1000x1000, canvas 400x400 → scale 0.4
// Source node at (200,200) with size 300x300 → canvas (80,80) size 120x120
function makeSourceNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    x: 200,
    y: 200,
    width: 300,
    height: 300,
    type: 'product',
    priority: 0,
    unique: 'n1',
    ...overrides,
  }
}

// Canvas-space center of the default node: (80+60, 80+60) = (140, 140)
const NODE_CENTER_X = 140
const NODE_CENTER_Y = 140

// Delete button center in canvas space: x=80+120-DEL_BTN_OFFSET=170, y=80+DEL_BTN_OFFSET=110
const DEL_X = 80 + 120 - DEL_BTN_OFFSET // 170
const DEL_Y = 80 + DEL_BTN_OFFSET // 110

// Bottom-right anchor hit point (safe interior): ~(185,185)
const BR_ANCHOR_X = 185
const BR_ANCHOR_Y = 185

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CanvasEditor', () => {
  let canvas: HTMLCanvasElement
  let editor: CanvasEditor
  let onUpdate: ReturnType<typeof vi.fn>
  let onLayersChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    const c = makeCanvas()
    canvas = c.canvas
    onUpdate = vi.fn()
    onLayersChange = vi.fn()
    editor = new CanvasEditor({
      canvas,
      dimensions: { width: 1000, height: 1000 },
      onUpdate,
      onLayersChange,
    })
  })

  afterEach(() => {
    editor.destroy()
  })

  // ── Construction ────────────────────────────────────────────────────────────

  it('instantiates without error given a real canvas element', () => {
    expect(editor).toBeDefined()
  })

  // ── Selection ───────────────────────────────────────────────────────────────

  describe('selection', () => {
    it('triggers onLayersChange when a node is clicked for the first time', () => {
      const node = makeSourceNode()
      editor.loadItems([node])
      onLayersChange.mockClear()

      fireMouseEvent(canvas, 'mousemove', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(canvas, 'mousedown', NODE_CENTER_X, NODE_CENTER_Y)

      expect(onLayersChange).toHaveBeenCalled()
    })

    it('does not fire onLayersChange when clicking empty canvas', () => {
      editor.loadItems([makeSourceNode()])
      onLayersChange.mockClear()

      // Click well outside the node bounds
      fireMouseEvent(canvas, 'mousemove', 300, 300)
      fireMouseEvent(canvas, 'mousedown', 300, 300)

      expect(onLayersChange).not.toHaveBeenCalled()
    })
  })

  // ── Dragging ─────────────────────────────────────────────────────────────────

  describe('dragging', () => {
    it('calls onUpdate during a drag move', () => {
      editor.loadItems([makeSourceNode()])
      onUpdate.mockClear()

      // hover → select → drag
      fireMouseEvent(canvas, 'mousemove', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(canvas, 'mousedown', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(
        canvas,
        'mousemove',
        NODE_CENTER_X + 20,
        NODE_CENTER_Y + 20
      )

      expect(onUpdate).toHaveBeenCalled()
    })

    it('does not call onUpdate when moving without clicking', () => {
      editor.loadItems([makeSourceNode()])
      onUpdate.mockClear()

      fireMouseEvent(
        canvas,
        'mousemove',
        NODE_CENTER_X + 10,
        NODE_CENTER_Y + 10
      )

      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  // ── Resizing ─────────────────────────────────────────────────────────────────

  describe('resizing', () => {
    it('calls onUpdate when dragging the bottom-right anchor', () => {
      editor.loadItems([makeSourceNode()])
      onUpdate.mockClear()

      // Select node
      fireMouseEvent(canvas, 'mousemove', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(canvas, 'mousedown', NODE_CENTER_X, NODE_CENTER_Y)
      mouseUp()

      // Hover over anchor → mousedown on anchor → drag
      fireMouseEvent(canvas, 'mousemove', BR_ANCHOR_X, BR_ANCHOR_Y)
      fireMouseEvent(canvas, 'mousedown', BR_ANCHOR_X, BR_ANCHOR_Y)
      fireMouseEvent(canvas, 'mousemove', BR_ANCHOR_X + 30, BR_ANCHOR_Y + 30)

      expect(onUpdate).toHaveBeenCalled()
    })
  })

  // ── Deletion ─────────────────────────────────────────────────────────────────

  describe('deletion', () => {
    it('removes the node and emits onUpdate with an empty array', () => {
      editor.loadItems([makeSourceNode()])
      onUpdate.mockClear()

      // Select node
      fireMouseEvent(canvas, 'mousemove', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(canvas, 'mousedown', NODE_CENTER_X, NODE_CENTER_Y)
      mouseUp()

      // Move to delete button → click
      fireMouseEvent(canvas, 'mousemove', DEL_X, DEL_Y)
      fireMouseEvent(canvas, 'mousedown', DEL_X, DEL_Y)

      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1]
      expect(lastCall[0]).toHaveLength(0)
    })

    it('calls onLayersChange after deletion', () => {
      editor.loadItems([makeSourceNode()])
      onLayersChange.mockClear()

      fireMouseEvent(canvas, 'mousemove', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(canvas, 'mousedown', NODE_CENTER_X, NODE_CENTER_Y)
      mouseUp()
      fireMouseEvent(canvas, 'mousemove', DEL_X, DEL_Y)
      fireMouseEvent(canvas, 'mousedown', DEL_X, DEL_Y)

      expect(onLayersChange).toHaveBeenCalled()
      const lastLayers =
        onLayersChange.mock.calls[onLayersChange.mock.calls.length - 1]
      expect(lastLayers[0]).toHaveLength(0)
    })
  })

  // ── Layer update callback ─────────────────────────────────────────────────────

  describe('layer update callback', () => {
    it('emits onLayersChange after loadItems', () => {
      editor.loadItems([makeSourceNode()])
      expect(onLayersChange).toHaveBeenCalledWith(expect.any(Array))
    })

    it('emits onLayersChange after addDroppedItem', () => {
      onLayersChange.mockClear()
      const payload: CanvasDropPayload = {
        x: 50,
        y: 50,
        type: 'logo',
        widthPercentage: 30,
        heightPercentage: 20,
      }
      editor.addDroppedItem(payload)
      expect(onLayersChange).toHaveBeenCalled()
    })

    it('emits nodes in priority-descending order (topmost first)', () => {
      const nodeA = makeSourceNode({ unique: 'a', priority: 0 })
      const nodeB = makeSourceNode({ unique: 'b', priority: 1 })
      editor.loadItems([nodeA, nodeB])

      const layers: CanvasNode[] = onLayersChange.mock.calls.at(-1)![0]
      // highest priority first
      expect(layers[0].unique).toBe('b')
      expect(layers[1].unique).toBe('a')
    })
  })

  // ── Update callback shape ─────────────────────────────────────────────────────

  describe('update callback shape', () => {
    it('items emitted by onUpdate have the expected CanvasNode fields', () => {
      const payload: CanvasDropPayload = {
        x: 10,
        y: 10,
        type: 'button',
        widthPercentage: 40,
        heightPercentage: 30,
        unique: 'dropped-1',
      }
      editor.addDroppedItem(payload)

      const items: CanvasNode[] = onUpdate.mock.calls[0][0]
      expect(items).toHaveLength(1)
      const item = items[0]
      expect(item).toHaveProperty('x')
      expect(item).toHaveProperty('y')
      expect(item).toHaveProperty('width')
      expect(item).toHaveProperty('height')
      expect(item).toHaveProperty('type', 'button')
      expect(item).toHaveProperty('priority')
      expect(item).toHaveProperty('unique')
    })

    it('onUpdate converts canvas positions back to source space', () => {
      // canvas 400x400, source 1000x1000 → scale 0.4
      // Drop at canvas (40, 40) → source (100, 100) after back-conversion
      const payload: CanvasDropPayload = {
        x: 40,
        y: 40,
        type: 'logo',
        widthPercentage: 40,
        heightPercentage: 40,
        unique: 'src-check',
      }
      editor.addDroppedItem(payload)

      const items: CanvasNode[] = onUpdate.mock.calls[0][0]
      const item = items[0]
      // x/y come from the canvas-space drop position converted back to source
      // drop at canvas (40,40), canvas=400x400, source=1000x1000 → source x = 40*(1000/400)=100
      expect(item.x).toBeCloseTo(100)
      expect(item.y).toBeCloseTo(100)
    })
  })

  // ── setLayerOrder ────────────────────────────────────────────────────────────

  describe('setLayerOrder', () => {
    it('reorders nodes and emits onUpdate', () => {
      const a = makeSourceNode({ unique: 'a', priority: 0 })
      const b = makeSourceNode({ unique: 'b', priority: 1 })
      editor.loadItems([a, b])
      onUpdate.mockClear()

      editor.setLayerOrder(['a', 'b'])

      expect(onUpdate).toHaveBeenCalled()
    })
  })

  // ── destroy ──────────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('removes event listeners so subsequent events are ignored', () => {
      editor.loadItems([makeSourceNode()])
      editor.destroy()
      onUpdate.mockClear()

      fireMouseEvent(canvas, 'mousemove', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(canvas, 'mousedown', NODE_CENTER_X, NODE_CENTER_Y)
      fireMouseEvent(
        canvas,
        'mousemove',
        NODE_CENTER_X + 20,
        NODE_CENTER_Y + 20
      )

      expect(onUpdate).not.toHaveBeenCalled()
    })
  })
})
