import type {
  CanvasNode,
  CanvasDimensions,
  CanvasDropPayload,
  CanvasResizeAnchor,
  CanvasEditorOptions,
  CanvasEditorAdapter,
} from './types'
import { getConstrainedWidth, getConstrainedHeight } from './utils/constraints'
import { createNodeFromDropPayload } from './utils/drop'
import { drawShape } from './drawing/drawShape'
import { drawAnchors } from './drawing/drawAnchors'
import { drawBorders } from './drawing/drawBorders'
import { drawDeleteBtn } from './drawing/drawDeleteBtn'
import { getDeleteBtnCenter } from './drawing/drawDeleteBtn'
import {
  findTopNode,
  findHitAnchor,
  isOnDeleteBtn,
  applyAnchorResize,
  getCursorStyle,
} from './events/mouseEvents'

export class CanvasEditor<T = CanvasNode> {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private sourceDimensions: CanvasDimensions
  private canvasDimensions: CanvasDimensions

  // canvas-space nodes ordered [topmost, ..., bottommost]
  private nodes: CanvasNode[] = []
  private sourceItems: Map<string, T> = new Map()

  private activeItem: CanvasNode | null = null
  private hoverItem: CanvasNode | null = null
  private activeAnchor: CanvasResizeAnchor | null = null
  private clicked = false
  private onDeleteButton = false
  private lastMouseX = 0
  private lastMouseY = 0

  private adapter: Required<CanvasEditorAdapter<T>>
  private onUpdate?: (items: T[]) => void
  private onLayersChange?: (items: CanvasNode[]) => void

  private _mousedownHandler: (e: MouseEvent) => void
  private _mousemoveHandler: (e: MouseEvent) => void
  private _globalMouseupHandler: () => void

  constructor(options: CanvasEditorOptions<T>) {
    this.canvas = options.canvas
    this.sourceDimensions = { ...options.dimensions }
    this.onUpdate = options.onUpdate
    this.onLayersChange = options.onLayersChange

    const adapter = options.adapter ?? {}
    this.adapter = {
      fromItem: adapter.fromItem ?? ((item) => item as unknown as CanvasNode),
      toItem: adapter.toItem ?? ((node) => node as unknown as T),
      createItem: adapter.createItem ?? ((node) => node as unknown as T),
    }

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('CanvasEditor: could not get 2d context')
    this.ctx = ctx

    this.canvasDimensions = {
      width: this.canvas.width,
      height: this.canvas.height,
    }

    this._mousedownHandler = (e) => this._onMouseDown(e)
    this._mousemoveHandler = (e) => this._onMouseMove(e)
    this._globalMouseupHandler = () => this._onGlobalMouseUp()

    this.canvas.addEventListener('mousedown', this._mousedownHandler)
    this.canvas.addEventListener('mousemove', this._mousemoveHandler)
    window.addEventListener('mouseup', this._globalMouseupHandler)
  }

  // ─── Public Lifecycle ────────────────────────────────────────────────────────

  loadItems(items: T[]): void {
    this.sourceItems.clear()
    this.activeItem = null
    this.hoverItem = null
    this.activeAnchor = null
    this.clicked = false

    const sourceNodes = items.map((item) => this.adapter.fromItem(item))

    // sort descending by priority so nodes[0] = topmost
    sourceNodes.sort((a, b) => b.priority - a.priority)

    this.nodes = sourceNodes.map((n) => this._toCanvasSpace(n))

    items.forEach((item) => {
      const node = this.adapter.fromItem(item)
      this.sourceItems.set(node.unique, item)
    })

    this._draw()
    this._emitLayersChange()
  }

  setDimensions(dimensions: CanvasDimensions): void {
    const sourceNodes = this.nodes.map((n) => this._fromCanvasSpace(n))
    this.sourceDimensions = { ...dimensions }

    if (this.canvasDimensions.width > 0) {
      const newHeight = this.canvasDimensions.width * (dimensions.height / dimensions.width)
      this.canvas.height = Math.round(newHeight)
      this.canvasDimensions = { width: this.canvasDimensions.width, height: Math.round(newHeight) }
    }

    this.nodes = sourceNodes.map((n) => this._toCanvasSpace(n))
    this._draw()
  }

  setContainerWidth(width: number): void {
    if (width <= 0) return
    const sourceNodes = this.nodes.map((n) => this._fromCanvasSpace(n))

    const newHeight = Math.round(width * (this.sourceDimensions.height / this.sourceDimensions.width))
    this.canvas.width = width
    this.canvas.height = newHeight
    this.canvasDimensions = { width, height: newHeight }

    this.nodes = sourceNodes.map((n) => this._toCanvasSpace(n))

    // re-resolve activeItem and hoverItem references after remapping
    this.activeItem = this.activeItem
      ? (this.nodes.find((n) => n.unique === this.activeItem!.unique) ?? null)
      : null
    this.hoverItem = this.hoverItem
      ? (this.nodes.find((n) => n.unique === this.hoverItem!.unique) ?? null)
      : null

    this._draw()
  }

  addDroppedItem(payload: CanvasDropPayload): void {
    const newNode = createNodeFromDropPayload(
      payload,
      this.canvasDimensions.width,
      this.canvasDimensions.height
    )
    newNode.priority = this.nodes.length
    this.nodes.unshift(newNode)

    this._reassignPriorities()
    this._draw()
    this._emitUpdate()
    this._emitLayersChange()
  }

  setActiveItem(unique: string | null): void {
    if (unique === null) {
      this.activeItem = null
    } else {
      this.activeItem = this.nodes.find((n) => n.unique === unique) ?? null
    }
    this._draw()
  }

  setLayerOrder(uniques: string[]): void {
    const nodeMap = new Map(this.nodes.map((n) => [n.unique, n]))
    this.nodes = uniques
      .map((u) => nodeMap.get(u))
      .filter((n): n is CanvasNode => n != null)
    this._reassignPriorities()
    this._draw()
    this._emitUpdate()
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this._mousedownHandler)
    this.canvas.removeEventListener('mousemove', this._mousemoveHandler)
    window.removeEventListener('mouseup', this._globalMouseupHandler)
  }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  private _draw(): void {
    if (this.canvasDimensions.width <= 0 || this.canvasDimensions.height <= 0) return

    const { width, height } = this.canvasDimensions
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillStyle = '#D9D9D9'
    this.ctx.fillRect(0, 0, width, height)

    const focusedUnique = this.activeItem?.unique ?? this.hoverItem?.unique ?? null

    // draw back to front
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i]
      const isActive = node.unique === this.activeItem?.unique
      const dimmed = focusedUnique !== null && node.unique !== focusedUnique

      drawShape(this.ctx, node, { dimmed })

      if (isActive) {
        drawBorders(this.ctx, node)
        drawAnchors(this.ctx, node)
      }
    }

    if (this.activeItem) {
      drawDeleteBtn(this.ctx, this.activeItem)
    }
  }

  // ─── Mouse Events ─────────────────────────────────────────────────────────────

  private _onMouseMove(e: MouseEvent): void {
    const { offsetX, offsetY } = e
    const prevX = this.lastMouseX
    const prevY = this.lastMouseY
    this.lastMouseX = offsetX
    this.lastMouseY = offsetY

    this.hoverItem = findTopNode(offsetX, offsetY, this.nodes)

    if (this.activeItem && this.clicked) {
      if (this.activeAnchor) {
        applyAnchorResize(this.activeAnchor, offsetX, offsetY, this.activeItem)
      } else {
        this.activeItem.x += offsetX - prevX
        this.activeItem.y += offsetY - prevY
      }
      this._draw()
      this._emitUpdate()
    } else if (!this.activeItem) {
      this._draw()
    }

    this._updateCursor(offsetX, offsetY)
  }

  private _updateCursor(offsetX: number, offsetY: number): void {
    if (this.activeItem) {
      this.onDeleteButton = isOnDeleteBtn(offsetX, offsetY, this.activeItem)
      if (!this.clicked) {
        this.activeAnchor = findHitAnchor(offsetX, offsetY, this.activeItem)
      }
    } else {
      this.onDeleteButton = false
    }

    this.canvas.style.cursor = getCursorStyle({
      hoverNode: this.hoverItem,
      activeNode: this.activeItem,
      activeAnchor: this.activeAnchor,
      onDeleteBtn: this.onDeleteButton,
    })
  }

  private _onMouseDown(_e: MouseEvent): void {
    this.clicked = true

    const { hoverItem, activeItem, activeAnchor } = this

    if (activeAnchor) return

    if (hoverItem) {
      if (hoverItem.unique !== activeItem?.unique) {
        this.activeItem = hoverItem
        this._moveToTop(hoverItem)
        this._draw()
        this._emitLayersChange()
      } else if (this.onDeleteButton) {
        this.nodes = this.nodes.filter((n) => n.unique !== hoverItem.unique)
        this.sourceItems.delete(hoverItem.unique)
        this.activeItem = null
        this.hoverItem = null
        this._reassignPriorities()
        this._draw()
        this._emitUpdate()
        this._emitLayersChange()
      }
    } else {
      this.activeItem = null
      this._draw()
    }
  }

  private _onGlobalMouseUp(): void {
    this.clicked = false
    if (this.activeAnchor) {
      this.activeAnchor = null
      return
    }
    if (!this.hoverItem) {
      this.activeItem = null
      this._draw()
    }
  }

  // ─── Item Ordering ───────────────────────────────────────────────────────────

  private _moveToTop(item: CanvasNode): void {
    const idx = this.nodes.findIndex((n) => n.unique === item.unique)
    if (idx <= 0) return
    this.nodes.splice(idx, 1)
    this.nodes.unshift(item)
    this._reassignPriorities()
  }

  private _reassignPriorities(): void {
    const last = this.nodes.length - 1
    this.nodes.forEach((node, i) => {
      node.priority = last - i
    })
  }

  // ─── Coordinate Conversion ───────────────────────────────────────────────────

  private _toCanvasSpace(node: CanvasNode): CanvasNode {
    const { width: cw, height: ch } = this.canvasDimensions
    const { width: sw, height: sh } = this.sourceDimensions
    if (sw === 0 || sh === 0) return { ...node }
    const sx = cw / sw
    const sy = ch / sh
    return {
      ...node,
      x: node.x * sx,
      y: node.y * sy,
      width: getConstrainedWidth(node) * sx,
      height: getConstrainedHeight(node) * sy,
      minWidth: node.minWidth != null ? node.minWidth * sx : undefined,
      minHeight: node.minHeight != null ? node.minHeight * sy : undefined,
      maxHeight: node.maxHeight != null ? node.maxHeight * sy : undefined,
    }
  }

  private _fromCanvasSpace(node: CanvasNode): CanvasNode {
    const { width: cw, height: ch } = this.canvasDimensions
    const { width: sw, height: sh } = this.sourceDimensions
    if (cw === 0 || ch === 0) return { ...node }
    const sx = sw / cw
    const sy = sh / ch
    return {
      ...node,
      x: node.x * sx,
      y: node.y * sy,
      width: node.width * sx,
      height: node.height * sy,
      minWidth: node.minWidth != null ? node.minWidth * sx : undefined,
      minHeight: node.minHeight != null ? node.minHeight * sy : undefined,
      maxHeight: node.maxHeight != null ? node.maxHeight * sy : undefined,
    }
  }

  // ─── Emit Helpers ────────────────────────────────────────────────────────────

  private _emitUpdate(): void {
    if (!this.onUpdate) return
    const items = this.nodes.map((node) => {
      const sourceNode = this._fromCanvasSpace(node)
      const source = this.sourceItems.get(node.unique)
      return source
        ? this.adapter.toItem(sourceNode, source)
        : this.adapter.createItem(sourceNode)
    })
    this.onUpdate(items)
  }

  private _emitLayersChange(): void {
    if (!this.onLayersChange) return
    const nodes = this.nodes.map((node) => this._fromCanvasSpace(node))
    this.onLayersChange(nodes)
  }
}
