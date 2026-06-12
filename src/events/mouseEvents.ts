import type { CanvasNode, CanvasResizeAnchor } from '../types'
import {
  getConstrainedWidth,
  getConstrainedHeight,
  calculateResizeResult,
} from '../utils/constraints'
import { getScaledAnchorMetrics } from '../utils/helpers'
import { getDeleteBtnCenter } from '../drawing/drawDeleteBtn'
import { DEL_BTN_RADIUS, ANCHOR_CURSOR_MAP } from '../constants'

type HitBox = { x: number; y: number; width: number; height: number }

function inBounds(px: number, py: number, box: HitBox): boolean {
  return (
    px > box.x &&
    px < box.x + box.width &&
    py > box.y &&
    py < box.y + box.height
  )
}

export function findTopNode(
  x: number,
  y: number,
  nodes: CanvasNode[]
): CanvasNode | null {
  return (
    nodes.find((n) =>
      inBounds(x, y, {
        x: n.x,
        y: n.y,
        width: getConstrainedWidth(n),
        height: getConstrainedHeight(n),
      })
    ) ?? null
  )
}

export function findHitAnchor(
  x: number,
  y: number,
  node: CanvasNode
): CanvasResizeAnchor | null {
  const { width: aw, height: ah, cornerSize } = getScaledAnchorMetrics(node)
  const w = getConstrainedWidth(node)
  const h = getConstrainedHeight(node)

  const hitBoxes: Record<CanvasResizeAnchor, HitBox> = {
    'top-left': {
      x: node.x - aw / 2,
      y: node.y - aw / 2,
      width: cornerSize,
      height: cornerSize,
    },
    'top-middle': {
      x: node.x + (w - ah) / 2,
      y: node.y - aw / 2,
      width: ah,
      height: aw,
    },
    'top-right': {
      x: node.x + w - ah,
      y: node.y - aw / 2,
      width: cornerSize,
      height: cornerSize,
    },
    'right-middle': {
      x: node.x + w - aw / 2,
      y: node.y + (h - ah) / 2,
      width: aw,
      height: ah,
    },
    'bottom-right': {
      x: node.x + w - ah,
      y: node.y + h - ah,
      width: cornerSize,
      height: cornerSize,
    },
    'bottom-middle': {
      x: node.x + (w - ah) / 2,
      y: node.y + h - aw / 2,
      width: ah,
      height: aw,
    },
    'bottom-left': {
      x: node.x - aw / 2,
      y: node.y + h - ah,
      width: cornerSize,
      height: cornerSize,
    },
    'left-middle': {
      x: node.x - aw / 2,
      y: node.y + (h - ah) / 2,
      width: aw,
      height: ah,
    },
  }

  for (const [anchor, box] of Object.entries(hitBoxes) as [
    CanvasResizeAnchor,
    HitBox,
  ][]) {
    if (inBounds(x, y, box)) return anchor
  }
  return null
}

export function isOnDeleteBtn(x: number, y: number, node: CanvasNode): boolean {
  const { x: cx, y: cy } = getDeleteBtnCenter(node)
  const dx = x - cx
  const dy = y - cy
  return Math.sqrt(dx * dx + dy * dy) <= DEL_BTN_RADIUS
}

export function applyAnchorResize(
  anchor: CanvasResizeAnchor,
  mouseX: number,
  mouseY: number,
  node: CanvasNode
): void {
  const resizeAxes: Record<
    CanvasResizeAnchor,
    Array<'left' | 'right' | 'top' | 'bottom'>
  > = {
    'top-left': ['left', 'top'],
    'top-middle': ['top'],
    'top-right': ['right', 'top'],
    'right-middle': ['right'],
    'bottom-right': ['right', 'bottom'],
    'bottom-middle': ['bottom'],
    'bottom-left': ['left', 'bottom'],
    'left-middle': ['left'],
  }

  for (const edge of resizeAxes[anchor]) {
    const isHorizontal = edge === 'left' || edge === 'right'
    const result = calculateResizeResult(
      edge,
      isHorizontal ? mouseX : mouseY,
      node
    )
    if (result.x !== undefined) node.x = result.x
    if (result.y !== undefined) node.y = result.y
    if (result.width !== undefined) node.width = result.width
    if (result.height !== undefined) node.height = result.height
  }
}

export type CursorContext = {
  hoverNode: CanvasNode | null
  activeNode: CanvasNode | null
  activeAnchor: CanvasResizeAnchor | null
  onDeleteBtn: boolean
}

export function getCursorStyle(ctx: CursorContext): string {
  const { hoverNode, activeNode, activeAnchor, onDeleteBtn } = ctx

  if (!activeNode) {
    return hoverNode ? 'pointer' : 'default'
  }

  if (onDeleteBtn) return 'pointer'
  if (activeAnchor) return ANCHOR_CURSOR_MAP[activeAnchor]
  if (hoverNode && hoverNode.unique === activeNode.unique) return 'all-scroll'
  if (hoverNode) return 'pointer'
  return 'default'
}
