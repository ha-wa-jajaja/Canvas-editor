import { ANCHOR_HEIGHT, ANCHOR_WIDTH, CORNER_ANCHOR_SIZE } from '../constants'
import type { CanvasAnchorMetrics, CanvasNode } from '../types'
import { clamp } from './math'

let fallbackSequence = 0

export function createUniqueId(
  type: string,
  x = 0,
  y = 0,
  priority = 0
): string {
  fallbackSequence += 1
  return `${type}-${Date.now()}-${fallbackSequence}-${x}-${y}-${priority}`
}

export function getAnchorScale(
  node: Pick<CanvasNode, 'width' | 'height'>
): number {
  return clamp(
    Math.min(node.width, node.height) / (CORNER_ANCHOR_SIZE * 3),
    0.3,
    1
  )
}

export function getScaledAnchorMetrics(
  node: Pick<CanvasNode, 'width' | 'height'>
): CanvasAnchorMetrics {
  const scale = getAnchorScale(node)

  return {
    width: ANCHOR_WIDTH * scale,
    height: ANCHOR_HEIGHT * scale,
    cornerSize: CORNER_ANCHOR_SIZE * scale,
    scale,
  }
}
