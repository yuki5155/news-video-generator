import { describe, expect, it } from 'vitest'
import { interpolatePosition } from './keyframes'
import type { PositionKeyframe } from '../schema/script'

describe('interpolatePosition', () => {
  const keyframes: PositionKeyframe[] = [
    { time: 1, position: [0, 0, 0] },
    { time: 3, position: [4, 0, 0] },
  ]

  it('clamps to the first keyframe before its time', () => {
    expect(interpolatePosition(keyframes, 0)).toEqual([0, 0, 0])
  })

  it('clamps to the last keyframe after its time', () => {
    expect(interpolatePosition(keyframes, 10)).toEqual([4, 0, 0])
  })

  it('linearly interpolates between two keyframes', () => {
    expect(interpolatePosition(keyframes, 2)).toEqual([2, 0, 0])
  })

  it('returns an exact keyframe position at its own time', () => {
    expect(interpolatePosition(keyframes, 3)).toEqual([4, 0, 0])
  })

  it('does not require keyframes to be passed in time order', () => {
    const reversed = [...keyframes].reverse()
    expect(interpolatePosition(reversed, 2)).toEqual([2, 0, 0])
  })

  it('throws when given no keyframes', () => {
    expect(() => interpolatePosition([], 0)).toThrow()
  })
})
