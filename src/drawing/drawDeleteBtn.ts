import type { CanvasNode } from '../types'
import { DEL_BTN_OFFSET, DEL_BTN_RADIUS } from '../constants'
import { getConstrainedWidth } from '../utils/constraints'

export function getDeleteBtnCenter(node: CanvasNode): { x: number; y: number } {
  return {
    x: node.x + getConstrainedWidth(node) - DEL_BTN_OFFSET,
    y: node.y + DEL_BTN_OFFSET,
  }
}

export function drawDeleteBtn(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode
): void {
  const { x: cx, y: cy } = getDeleteBtnCenter(node)

  ctx.fillStyle = '#D20000'
  ctx.beginPath()
  ctx.arc(cx, cy, DEL_BTN_RADIUS, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()

  // Draw X icon
  const pad = DEL_BTN_RADIUS * 0.35
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.moveTo(cx - DEL_BTN_RADIUS + pad, cy - DEL_BTN_RADIUS + pad)
  ctx.lineTo(cx + DEL_BTN_RADIUS - pad, cy + DEL_BTN_RADIUS - pad)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx + DEL_BTN_RADIUS - pad, cy - DEL_BTN_RADIUS + pad)
  ctx.lineTo(cx - DEL_BTN_RADIUS + pad, cy + DEL_BTN_RADIUS - pad)
  ctx.stroke()
}
