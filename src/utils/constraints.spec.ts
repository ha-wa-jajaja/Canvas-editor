import { describe, it, expect } from 'vitest'
import {
  getConstrainedWidth,
  getConstrainedHeight,
  getResizeWidth,
  getResizeHeight,
  calculateResizeResult,
} from './constraints'
import { EL_MIN_SIZE } from '../constants'

// EL_MIN_SIZE = CORNER_ANCHOR_SIZE * 2 + 4 = (20 + 6) * 2 + 4 = 56

describe('getConstrainedWidth', () => {
  it('returns width when it exceeds EL_MIN_SIZE', () => {
    expect(getConstrainedWidth({ width: 200, minWidth: undefined })).toBe(200)
  })

  it('clamps to EL_MIN_SIZE when width is below minimum', () => {
    expect(getConstrainedWidth({ width: 10, minWidth: undefined })).toBe(EL_MIN_SIZE)
  })

  it('uses minWidth when it exceeds both width and EL_MIN_SIZE', () => {
    expect(getConstrainedWidth({ width: 50, minWidth: 120 })).toBe(120)
  })

  it('EL_MIN_SIZE wins over a minWidth smaller than it', () => {
    expect(getConstrainedWidth({ width: 10, minWidth: 20 })).toBe(EL_MIN_SIZE)
  })

  it('returns width when it is exactly EL_MIN_SIZE', () => {
    expect(getConstrainedWidth({ width: EL_MIN_SIZE, minWidth: undefined })).toBe(EL_MIN_SIZE)
  })
})

describe('getConstrainedHeight', () => {
  it('returns height when it exceeds EL_MIN_SIZE and has no maxHeight', () => {
    expect(getConstrainedHeight({ height: 200, minHeight: undefined, maxHeight: undefined })).toBe(200)
  })

  it('clamps to EL_MIN_SIZE when height is below minimum', () => {
    expect(getConstrainedHeight({ height: 10, minHeight: undefined, maxHeight: undefined })).toBe(EL_MIN_SIZE)
  })

  it('clamps to maxHeight when height exceeds it', () => {
    expect(getConstrainedHeight({ height: 300, minHeight: undefined, maxHeight: 200 })).toBe(200)
  })

  it('returns EL_MIN_SIZE when height is below min and maxHeight is large', () => {
    expect(getConstrainedHeight({ height: 10, minHeight: undefined, maxHeight: 500 })).toBe(EL_MIN_SIZE)
  })

  it('minHeight overrides EL_MIN_SIZE when larger', () => {
    expect(getConstrainedHeight({ height: 10, minHeight: 80, maxHeight: undefined })).toBe(80)
  })

  it('clamps result between minHeight and maxHeight', () => {
    expect(getConstrainedHeight({ height: 10, minHeight: 60, maxHeight: 90 })).toBe(60)
    expect(getConstrainedHeight({ height: 200, minHeight: 60, maxHeight: 90 })).toBe(90)
  })
})

describe('getResizeWidth', () => {
  const node = { x: 100, y: 50, width: 200, height: 150, minWidth: undefined, minHeight: undefined, maxHeight: undefined }

  describe('right edge', () => {
    it('returns pointer distance from node origin', () => {
      expect(getResizeWidth('right', 350, node)).toBe(250) // 350-100
    })

    it('clamps to EL_MIN_SIZE when pointer is too close to origin', () => {
      expect(getResizeWidth('right', 110, node)).toBe(EL_MIN_SIZE) // 110-100=10 < 56
    })
  })

  describe('left edge', () => {
    it('returns remaining width when dragging left edge inward', () => {
      // currentWidth=200, node.x=100, pointerX=50 → 200+100-50=250
      expect(getResizeWidth('left', 50, node)).toBe(250)
    })

    it('clamps to EL_MIN_SIZE when dragging left edge past minimum', () => {
      // pointerX=250 → 200+100-250=50 < 56 → 56
      expect(getResizeWidth('left', 250, node)).toBe(EL_MIN_SIZE)
    })
  })

  it('respects minWidth constraint on right edge', () => {
    const nodeWithMin = { ...node, minWidth: 100 }
    expect(getResizeWidth('right', 130, nodeWithMin)).toBe(100) // 30 < 100
  })
})

describe('getResizeHeight', () => {
  const node = { x: 0, y: 100, width: 200, height: 200, minHeight: undefined, maxHeight: undefined, minWidth: undefined }

  describe('bottom edge', () => {
    it('returns pointer distance from node top', () => {
      expect(getResizeHeight('bottom', 400, node)).toBe(300) // 400-100
    })

    it('clamps to EL_MIN_SIZE when pointer is too close to top', () => {
      expect(getResizeHeight('bottom', 110, node)).toBe(EL_MIN_SIZE)
    })

    it('clamps to maxHeight on bottom edge', () => {
      const nodeWithMax = { ...node, maxHeight: 150 }
      expect(getResizeHeight('bottom', 400, nodeWithMax)).toBe(150) // 300 > 150
    })
  })

  describe('top edge', () => {
    it('returns remaining height when dragging top edge inward', () => {
      // currentHeight=200, node.y=100, pointerY=50 → 200+100-50=250
      expect(getResizeHeight('top', 50, node)).toBe(250)
    })

    it('clamps to EL_MIN_SIZE when dragging top edge past minimum', () => {
      expect(getResizeHeight('top', 280, node)).toBe(EL_MIN_SIZE) // 200+100-280=20 < 56
    })
  })
})

describe('calculateResizeResult', () => {
  const node = { x: 100, y: 100, width: 200, height: 200, minWidth: undefined, minHeight: undefined, maxHeight: undefined }

  it('left edge returns updated x and width', () => {
    // pointerX=50: newWidth=200+100-50=250, newX=100+200-250=-50
    const result = calculateResizeResult('left', 50, node)
    expect(result.width).toBe(250)
    expect(result.x).toBe(50) // 100 + 200 - 250 = 50
  })

  it('right edge returns only width', () => {
    const result = calculateResizeResult('right', 350, node)
    expect(result.width).toBe(250) // 350-100
    expect(result.x).toBeUndefined()
  })

  it('top edge returns updated y and height', () => {
    const result = calculateResizeResult('top', 50, node)
    expect(result.height).toBe(250)
    expect(result.y).toBe(50) // 100 + 200 - 250 = 50
  })

  it('bottom edge returns only height', () => {
    const result = calculateResizeResult('bottom', 350, node)
    expect(result.height).toBe(250) // 350-100
    expect(result.y).toBeUndefined()
  })

  it('clamps left resize to EL_MIN_SIZE and adjusts x accordingly', () => {
    // pointerX=320: newWidth=200+100-320=-20 → clamped to 56, newX=100+200-56=244
    const result = calculateResizeResult('left', 320, node)
    expect(result.width).toBe(EL_MIN_SIZE)
    expect(result.x).toBe(100 + 200 - EL_MIN_SIZE) // 244
  })
})
