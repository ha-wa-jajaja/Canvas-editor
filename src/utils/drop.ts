import type { CanvasDropPayload, CanvasNode } from '../types'
import {
  getInitialHeightFromDrop,
  getInitialWidthFromDrop,
} from './constraints'
import { createUniqueId } from './helpers'

export function createNodeFromDropPayload(
  payload: CanvasDropPayload,
  canvasWidth: number,
  canvasHeight: number
): CanvasNode {
  const priority = payload.priority ?? 0

  return {
    x: payload.x,
    y: payload.y,
    width: getInitialWidthFromDrop(payload, canvasWidth),
    height: getInitialHeightFromDrop(payload, canvasHeight),
    type: payload.type,
    priority,
    unique:
      payload.unique ??
      createUniqueId(payload.type, payload.x, payload.y, priority),
    minWidth: payload.minWidth,
    minHeight: payload.minHeight,
    maxHeight: payload.maxHeight,
  }
}
