export type CanvasDimensions = {
  width: number
  height: number
}

export type CanvasNodeGeometry = {
  x: number
  y: number
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  maxHeight?: number
}

export type CanvasNode = CanvasNodeGeometry & {
  type: string
  priority: number
  unique: string
}

export type CanvasDropPayload = {
  x: number
  y: number
  type: string
  widthPercentage: number
  heightPercentage: number
  minWidth?: number
  minHeight?: number
  maxHeight?: number
  priority?: number
  unique?: string
}

export type CanvasResizeAnchor =
  | 'top-left'
  | 'top-middle'
  | 'top-right'
  | 'right-middle'
  | 'bottom-right'
  | 'bottom-middle'
  | 'bottom-left'
  | 'left-middle'

export type CanvasResizeCursor =
  | 'col-resize'
  | 'row-resize'
  | 'ne-resize'
  | 'nw-resize'
  | 'se-resize'
  | 'sw-resize'
  | 'ew-resize'
  | 'ns-resize'

export type CanvasResizeAxis = 'left' | 'right' | 'top' | 'bottom'

export type CanvasAnchorMetrics = {
  width: number
  height: number
  cornerSize: number
  scale: number
}

export type CanvasMouseState = {
  clicked: boolean
  x: number
  y: number
  hoverItem: CanvasNode | null
  activeItem: CanvasNode | null
  activeAnchor: CanvasResizeAnchor | null
  onDeleteButton: boolean
}

export type CanvasEditorAdapter<T> = {
  fromItem?: (item: T) => CanvasNode
  toItem?: (node: CanvasNode, source: T) => T
  createItem?: (node: CanvasNode) => T
}

export type CanvasEditorOptions<T = CanvasNode> = {
  canvas: HTMLCanvasElement
  dimensions: CanvasDimensions
  adapter?: CanvasEditorAdapter<T>
  onUpdate?: (items: T[]) => void
  onLayersChange?: (items: CanvasNode[]) => void
}

export type CanvasResizeResult = {
  x?: number
  y?: number
  width?: number
  height?: number
}
