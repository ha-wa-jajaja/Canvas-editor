import type { CanvasNode } from '../types'
import { getConstrainedWidth, getConstrainedHeight } from '../utils/constraints'
import { getScaledAnchorMetrics } from '../utils/helpers'

const ANCHOR_COLOR = '#ffffff'

export function drawAnchors(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode
): void {
  const { width: aw, height: ah } = getScaledAnchorMetrics(node)
  const w = getConstrainedWidth(node)
  const h = getConstrainedHeight(node)

  ctx.fillStyle = ANCHOR_COLOR

  // top middle
  ctx.fillRect(node.x + (w - ah) / 2, node.y - aw / 2, ah, aw)
  // right middle
  ctx.fillRect(node.x + w - aw / 2, node.y + (h - ah) / 2, aw, ah)
  // bottom middle
  ctx.fillRect(node.x + (w - ah) / 2, node.y + h - aw / 2, ah, aw)
  // left middle
  ctx.fillRect(node.x - aw / 2, node.y + (h - ah) / 2, aw, ah)

  const lineWidth = aw
  const armLength = ah

  const drawCornerL = () => {
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = ANCHOR_COLOR
    ctx.stroke()
  }

  // top-left
  ctx.beginPath()
  ctx.moveTo(node.x + armLength, node.y)
  ctx.lineTo(node.x, node.y)
  ctx.lineTo(node.x, node.y + armLength)
  drawCornerL()

  // top-right
  ctx.beginPath()
  ctx.moveTo(node.x + w - armLength, node.y)
  ctx.lineTo(node.x + w, node.y)
  ctx.lineTo(node.x + w, node.y + armLength)
  drawCornerL()

  // bottom-right
  ctx.beginPath()
  ctx.moveTo(node.x + w, node.y + h - armLength)
  ctx.lineTo(node.x + w, node.y + h)
  ctx.lineTo(node.x + w - armLength, node.y + h)
  drawCornerL()

  // bottom-left
  ctx.beginPath()
  ctx.moveTo(node.x, node.y + h - armLength)
  ctx.lineTo(node.x, node.y + h)
  ctx.lineTo(node.x + armLength, node.y + h)
  drawCornerL()
}
