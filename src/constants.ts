import type { CanvasResizeAnchor, CanvasResizeCursor } from './types'

const ANCHOR_WIDTH = 12
const ANCHOR_HEIGHT = 20
const CORNER_ANCHOR_SIZE = ANCHOR_HEIGHT + ANCHOR_WIDTH / 2
const DEL_BTN_OFFSET = 30
const DEL_BTN_RADIUS = 16
const DEL_BTN_PADDING = 4
const EL_MIN_SIZE = CORNER_ANCHOR_SIZE * 2 + 4

const ANCHOR_CURSOR_MAP: Record<CanvasResizeAnchor, CanvasResizeCursor> = {
  'top-left': 'nw-resize',
  'top-middle': 'row-resize',
  'top-right': 'ne-resize',
  'right-middle': 'col-resize',
  'bottom-right': 'se-resize',
  'bottom-middle': 'row-resize',
  'bottom-left': 'sw-resize',
  'left-middle': 'col-resize',
}

export {
  ANCHOR_WIDTH,
  ANCHOR_HEIGHT,
  CORNER_ANCHOR_SIZE,
  DEL_BTN_OFFSET,
  DEL_BTN_RADIUS,
  DEL_BTN_PADDING,
  EL_MIN_SIZE,
  ANCHOR_CURSOR_MAP,
}
