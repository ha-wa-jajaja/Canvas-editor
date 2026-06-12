import type { CanvasNode } from '../types'
import { getConstrainedWidth, getConstrainedHeight } from '../utils/constraints'

const BORDER_COLOR = '#ffffff'
const BORDER_WIDTH = 6

export function drawBorders(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const w = getConstrainedWidth(node)
  const h = getConstrainedHeight(node)

  ctx.beginPath()
  ctx.moveTo(node.x, node.y)
  ctx.lineTo(node.x + w, node.y)
  ctx.lineTo(node.x + w, node.y + h)
  ctx.lineTo(node.x, node.y + h)
  ctx.closePath()
  ctx.lineWidth = BORDER_WIDTH
  ctx.strokeStyle = BORDER_COLOR
  ctx.stroke()
}
