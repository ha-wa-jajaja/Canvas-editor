import type { CanvasDimensions, CanvasNode } from '../types'
import { getConstrainedHeight, getConstrainedWidth } from './constraints'

export function convertNodeToCanvasSpace(
  node: CanvasNode,
  sourceDimensions: CanvasDimensions,
  canvasDimensions: CanvasDimensions
): CanvasNode {
  return {
    ...node,
    x: (node.x / sourceDimensions.width) * canvasDimensions.width,
    y: (node.y / sourceDimensions.height) * canvasDimensions.height,
    width:
      (getConstrainedWidth(node) / sourceDimensions.width) *
      canvasDimensions.width,
    height:
      (getConstrainedHeight(node) / sourceDimensions.height) *
      canvasDimensions.height,
  }
}

export function convertNodesToCanvasSpace(
  nodes: CanvasNode[],
  sourceDimensions: CanvasDimensions,
  canvasDimensions: CanvasDimensions
): CanvasNode[] {
  return nodes.map((node) =>
    convertNodeToCanvasSpace(node, sourceDimensions, canvasDimensions)
  )
}

export function convertNodeFromCanvasSpace(
  node: CanvasNode,
  canvasDimensions: CanvasDimensions,
  targetDimensions: CanvasDimensions
): CanvasNode {
  return {
    ...node,
    x: (node.x / canvasDimensions.width) * targetDimensions.width,
    y: (node.y / canvasDimensions.height) * targetDimensions.height,
    width: (node.width / canvasDimensions.width) * targetDimensions.width,
    height: (node.height / canvasDimensions.height) * targetDimensions.height,
  }
}

export function convertNodesFromCanvasSpace(
  nodes: CanvasNode[],
  canvasDimensions: CanvasDimensions,
  targetDimensions: CanvasDimensions
): CanvasNode[] {
  return nodes.map((node) =>
    convertNodeFromCanvasSpace(node, canvasDimensions, targetDimensions)
  )
}
