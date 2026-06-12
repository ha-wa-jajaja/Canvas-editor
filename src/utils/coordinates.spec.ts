import { describe, it, expect } from 'vitest'
import {
  convertNodeToCanvasSpace,
  convertNodesToCanvasSpace,
  convertNodeFromCanvasSpace,
  convertNodesFromCanvasSpace,
} from './coordinates'
import type { CanvasNode, CanvasDimensions } from '../types'

function makeNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    type: 'test',
    priority: 0,
    unique: 'n1',
    ...overrides,
  }
}

const src: CanvasDimensions = { width: 1000, height: 1000 }
const canvas: CanvasDimensions = { width: 400, height: 300 }

describe('convertNodeToCanvasSpace', () => {
  it('scales position proportionally', () => {
    const node = makeNode({ x: 100, y: 200 })
    const result = convertNodeToCanvasSpace(node, src, canvas)
    expect(result.x).toBeCloseTo(40)
    expect(result.y).toBeCloseTo(60)
  })

  it('scales width and height proportionally', () => {
    const node = makeNode({ width: 200, height: 150 })
    const result = convertNodeToCanvasSpace(node, src, canvas)
    expect(result.width).toBeCloseTo(80)
    expect(result.height).toBeCloseTo(45)
  })

  it('preserves all other node fields', () => {
    const node = makeNode({ type: 'logo', priority: 3, unique: 'u99' })
    const result = convertNodeToCanvasSpace(node, src, canvas)
    expect(result.type).toBe('logo')
    expect(result.priority).toBe(3)
    expect(result.unique).toBe('u99')
  })

  it('round-trips back to source values via convertNodeFromCanvasSpace', () => {
    const node = makeNode({ x: 100, y: 200, width: 300, height: 250 })
    const inCanvas = convertNodeToCanvasSpace(node, src, canvas)
    const back = convertNodeFromCanvasSpace(inCanvas, canvas, src)
    expect(back.x).toBeCloseTo(node.x)
    expect(back.y).toBeCloseTo(node.y)
    expect(back.width).toBeCloseTo(node.width)
    expect(back.height).toBeCloseTo(node.height)
  })

  it('round-trips correctly with a non-even scale ratio', () => {
    const src1920: CanvasDimensions = { width: 1920, height: 1080 }
    const canvas640: CanvasDimensions = { width: 640, height: 360 }
    const node = makeNode({ x: 300, y: 150, width: 960, height: 540 })
    const inCanvas = convertNodeToCanvasSpace(node, src1920, canvas640)
    const back = convertNodeFromCanvasSpace(inCanvas, canvas640, src1920)
    expect(back.x).toBeCloseTo(300, 5)
    expect(back.y).toBeCloseTo(150, 5)
    expect(back.width).toBeCloseTo(960, 5)
    expect(back.height).toBeCloseTo(540, 5)
  })

  it('round-trips multiple dimension pairs', () => {
    const pairs: Array<[CanvasDimensions, CanvasDimensions]> = [
      [
        { width: 800, height: 600 },
        { width: 320, height: 240 },
      ],
      [
        { width: 1600, height: 900 },
        { width: 480, height: 270 },
      ],
      [
        { width: 500, height: 500 },
        { width: 250, height: 250 },
      ],
    ]
    const node = makeNode({ x: 100, y: 80, width: 200, height: 150 })
    for (const [s, c] of pairs) {
      const inCanvas = convertNodeToCanvasSpace(node, s, c)
      const back = convertNodeFromCanvasSpace(inCanvas, c, s)
      expect(back.x).toBeCloseTo(node.x, 5)
      expect(back.y).toBeCloseTo(node.y, 5)
    }
  })
})

describe('convertNodesToCanvasSpace', () => {
  it('converts every node in the array', () => {
    const nodes = [
      makeNode({ unique: 'a', x: 0, y: 0 }),
      makeNode({ unique: 'b', x: 500, y: 500 }),
    ]
    const result = convertNodesToCanvasSpace(nodes, src, canvas)
    expect(result).toHaveLength(2)
    expect(result[0].x).toBeCloseTo(0)
    expect(result[1].x).toBeCloseTo(200)
  })
})

describe('convertNodeFromCanvasSpace', () => {
  it('scales back to target dimensions', () => {
    const node = makeNode({ x: 40, y: 60, width: 80, height: 45 })
    const result = convertNodeFromCanvasSpace(node, canvas, src)
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(200)
    expect(result.width).toBeCloseTo(200)
    expect(result.height).toBeCloseTo(150)
  })
})

describe('convertNodesFromCanvasSpace', () => {
  it('converts every node in the array', () => {
    const nodes = [
      makeNode({ unique: 'a', x: 0 }),
      makeNode({ unique: 'b', x: 200 }),
    ]
    const result = convertNodesFromCanvasSpace(nodes, canvas, src)
    expect(result).toHaveLength(2)
    expect(result[1].x).toBeCloseTo(500)
  })
})
