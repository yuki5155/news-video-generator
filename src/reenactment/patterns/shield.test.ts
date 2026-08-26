import { describe, expect, it } from 'vitest'
import { shieldPattern } from './shield'

const HALF_WIDTH_SPAN = 0.4

describe('shieldPattern', () => {
  it('splits the two halves apart by the final keyframe', () => {
    const scene = shieldPattern({ narration: '' })
    const left = scene.actors.find((a) => a.id === 'shield-left')!
    const right = scene.actors.find((a) => a.id === 'shield-right')!
    const leftEnd = left.motion!.at(-1)!.position[0]
    const rightEnd = right.motion!.at(-1)!.position[0]
    expect(leftEnd).toBeLessThan(0)
    expect(rightEnd).toBeGreaterThan(0)
    expect(rightEnd - leftEnd).toBeGreaterThan(HALF_WIDTH_SPAN)
  })

  it('moves the intruder marker toward the seam by the final keyframe', () => {
    const scene = shieldPattern({ narration: '' })
    const intruder = scene.actors.find((a) => a.id === 'intruder')!
    const first = intruder.motion!.at(0)!
    const last = intruder.motion!.at(-1)!
    expect(last.position[0]).toBeLessThan(first.position[0])
  })
})
