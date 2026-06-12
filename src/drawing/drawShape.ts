import type { CanvasNode } from '../types'
import { getConstrainedWidth, getConstrainedHeight } from '../utils/constraints'

const FILL_COLOR = '#E5E5E5'
const FILL_COLOR_DIMMED = '#E5E5E573'
const TEXT_COLOR = 'black'
const TEXT_COLOR_DIMMED = '#00000066'

export function drawShape(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode,
  options: { label?: string; dimmed?: boolean }
): void {
  const w = getConstrainedWidth(node)
  const h = getConstrainedHeight(node)
  const dimmed = options.dimmed ?? false

  ctx.fillStyle = dimmed ? FILL_COLOR_DIMMED : FILL_COLOR
  ctx.fillRect(node.x, node.y, w, h)

  const label = options.label ?? node.type
  ctx.font = '24px Arial'
  ctx.fillStyle = dimmed ? TEXT_COLOR_DIMMED : TEXT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, node.x + w / 2, node.y + h / 2)
}
