import { EL_MIN_SIZE } from '../constants'
import type {
  CanvasDropPayload,
  CanvasNodeGeometry,
  CanvasResizeAxis,
  CanvasResizeResult,
} from '../types'
import { clamp } from './math'

export function getConstrainedWidth(
  node: Pick<CanvasNodeGeometry, 'width' | 'minWidth'>
): number {
  const minWidth = Math.max(node.minWidth ?? 0, EL_MIN_SIZE)
  return Math.max(node.width, minWidth)
}

export function getConstrainedHeight(
  node: Pick<CanvasNodeGeometry, 'height' | 'minHeight' | 'maxHeight'>
): number {
  const minHeight = Math.max(node.minHeight ?? 0, EL_MIN_SIZE)

  if (node.maxHeight != null) {
    return clamp(Math.max(node.height, minHeight), minHeight, node.maxHeight)
  }

  return Math.max(node.height, minHeight)
}

export function getInitialWidthFromDrop(
  payload: Pick<CanvasDropPayload, 'widthPercentage' | 'minWidth'>,
  canvasWidth: number
): number {
  const calculatedWidth = canvasWidth * (payload.widthPercentage / 100)
  const minWidth = Math.max(payload.minWidth ?? 0, EL_MIN_SIZE)

  return Math.max(calculatedWidth, minWidth)
}

export function getInitialHeightFromDrop(
  payload: Pick<
    CanvasDropPayload,
    'heightPercentage' | 'minHeight' | 'maxHeight'
  >,
  canvasHeight: number
): number {
  const calculatedHeight = canvasHeight * (payload.heightPercentage / 100)
  const minHeight = Math.max(payload.minHeight ?? 0, EL_MIN_SIZE)

  if (payload.maxHeight != null) {
    return clamp(
      Math.max(calculatedHeight, minHeight),
      minHeight,
      payload.maxHeight
    )
  }

  return Math.max(calculatedHeight, minHeight)
}

export function getResizeWidth(
  edge: Extract<CanvasResizeAxis, 'left' | 'right'>,
  pointerX: number,
  node: CanvasNodeGeometry
): number {
  const currentWidth = getConstrainedWidth(node)
  const minWidth = Math.max(node.minWidth ?? 0, EL_MIN_SIZE)

  if (edge === 'right') {
    return Math.max(pointerX - node.x, minWidth)
  }

  return Math.max(currentWidth + node.x - pointerX, minWidth)
}

export function getResizeHeight(
  edge: Extract<CanvasResizeAxis, 'top' | 'bottom'>,
  pointerY: number,
  node: CanvasNodeGeometry
): number {
  const currentHeight = getConstrainedHeight(node)
  const minHeight = Math.max(node.minHeight ?? 0, EL_MIN_SIZE)

  if (edge === 'bottom') {
    const nextHeight = Math.max(pointerY - node.y, minHeight)
    return node.maxHeight != null
      ? Math.min(nextHeight, node.maxHeight)
      : nextHeight
  }

  const nextHeight = Math.max(currentHeight + node.y - pointerY, minHeight)
  return node.maxHeight != null
    ? Math.min(nextHeight, node.maxHeight)
    : nextHeight
}

export function calculateResizeResult(
  edge: CanvasResizeAxis,
  pointerValue: number,
  node: CanvasNodeGeometry
): CanvasResizeResult {
  switch (edge) {
    case 'left': {
      const width = getResizeWidth('left', pointerValue, node)
      return {
        x: node.x + getConstrainedWidth(node) - width,
        width,
      }
    }
    case 'right':
      return {
        width: getResizeWidth('right', pointerValue, node),
      }
    case 'top': {
      const height = getResizeHeight('top', pointerValue, node)
      return {
        y: node.y + getConstrainedHeight(node) - height,
        height,
      }
    }
    case 'bottom':
      return {
        height: getResizeHeight('bottom', pointerValue, node),
      }
  }
}
