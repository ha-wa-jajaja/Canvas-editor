import { describe, it, expect } from 'vitest'
import { getAnchorScale, getScaledAnchorMetrics } from './helpers'
import { findHitAnchor } from '../events/mouseEvents'
import {
  CORNER_ANCHOR_SIZE,
  ANCHOR_WIDTH,
  ANCHOR_HEIGHT,
  EL_MIN_SIZE,
} from '../constants'
import type { CanvasNode } from '../types'

function node(x: number, y: number, w: number, h: number): CanvasNode {
  return { x, y, width: w, height: h, type: 't', priority: 0, unique: 'n' }
}

describe('getAnchorScale', () => {
  it('returns 1 for a large node', () => {
    expect(getAnchorScale({ width: 400, height: 400 })).toBe(1)
  })

  it('returns 1 when min(w, h) exactly equals the full-scale threshold', () => {
    // threshold = CORNER_ANCHOR_SIZE * 3
    const threshold = CORNER_ANCHOR_SIZE * 3
    expect(getAnchorScale({ width: threshold, height: threshold })).toBe(1)
  })

  it('returns a proportional scale for intermediate node size', () => {
    const half = (CORNER_ANCHOR_SIZE * 3) / 2 // 50% of threshold
    expect(getAnchorScale({ width: half, height: half })).toBeCloseTo(0.5)
  })

  it('clamps to 0.3 for very small nodes', () => {
    expect(getAnchorScale({ width: 10, height: 10 })).toBe(0.3)
  })

  it('clamps based on the smaller dimension', () => {
    // wide but short: min is height
    expect(getAnchorScale({ width: 500, height: 10 })).toBe(0.3)
  })
})

describe('getScaledAnchorMetrics', () => {
  it('returns full-size metrics for a large node', () => {
    const metrics = getScaledAnchorMetrics({ width: 400, height: 400 })
    expect(metrics.scale).toBe(1)
    expect(metrics.width).toBe(ANCHOR_WIDTH)
    expect(metrics.height).toBe(ANCHOR_HEIGHT)
    expect(metrics.cornerSize).toBe(CORNER_ANCHOR_SIZE)
  })

  it('returns scaled-down metrics for a small node', () => {
    const n = { width: EL_MIN_SIZE, height: EL_MIN_SIZE }
    const scale = getAnchorScale(n)
    const metrics = getScaledAnchorMetrics(n)
    expect(metrics.scale).toBeCloseTo(scale)
    expect(metrics.width).toBeCloseTo(ANCHOR_WIDTH * scale)
    expect(metrics.height).toBeCloseTo(ANCHOR_HEIGHT * scale)
    expect(metrics.cornerSize).toBeCloseTo(CORNER_ANCHOR_SIZE * scale)
  })
})

describe('findHitAnchor – full-scale node', () => {
  // Node at (0, 0) with 200x200: scale = 1, aw=12, ah=20, cornerSize=26
  const n = node(0, 0, 200, 200)

  it('returns null for a point in the center', () => {
    expect(findHitAnchor(100, 100, n)).toBeNull()
  })

  it('detects top-left corner anchor', () => {
    // hitbox: x=-6, y=-6, w=26, h=26 → interior (0,0) is in bounds
    expect(findHitAnchor(0, 0, n)).toBe('top-left')
  })

  it('detects bottom-right corner anchor', () => {
    // hitbox: x=200-20=180, y=180, w=26, h=26 → hit at (185,185)
    expect(findHitAnchor(185, 185, n)).toBe('bottom-right')
  })

  it('detects right-middle anchor', () => {
    // hitbox: x=200-6=194, y=(200-20)/2=90, w=12, h=20 → hit at (196, 100)
    expect(findHitAnchor(196, 100, n)).toBe('right-middle')
  })

  it('detects top-middle anchor', () => {
    // hitbox: x=(200-20)/2=90, y=-6, w=20, h=12 → hit at (100, 0)
    expect(findHitAnchor(100, 0, n)).toBe('top-middle')
  })
})

describe('findHitAnchor – small node at EL_MIN_SIZE (anchor scaling)', () => {
  // Node at (100, 100) with EL_MIN_SIZE x EL_MIN_SIZE
  // scale = min(56,56)/78 ≈ 0.718, aw≈8.6, ah≈14.4, cornerSize≈18.7
  const small = node(100, 100, EL_MIN_SIZE, EL_MIN_SIZE)

  it('detects bottom-right anchor at the expected scaled position', () => {
    const { height: ah, cornerSize } = getScaledAnchorMetrics(small)
    // hitbox: x = 100+56-ah, y = 100+56-ah, w=cornerSize, h=cornerSize
    const hx = 100 + EL_MIN_SIZE - ah + cornerSize / 2
    const hy = 100 + EL_MIN_SIZE - ah + cornerSize / 2
    expect(findHitAnchor(hx, hy, small)).toBe('bottom-right')
  })

  it('returns null for point in the center of the small node', () => {
    expect(findHitAnchor(128, 128, small)).toBeNull()
  })

  it('scaled corners do not overlap with the middle anchors', () => {
    // top-left corner right edge must be left of top-middle anchor left edge
    const { width: aw, height: ah, cornerSize } = getScaledAnchorMetrics(small)
    const topLeftRightEdge = 100 - aw / 2 + cornerSize
    const topMiddleLeftEdge = 100 + (EL_MIN_SIZE - ah) / 2
    expect(topLeftRightEdge).toBeLessThan(topMiddleLeftEdge)
  })
})
