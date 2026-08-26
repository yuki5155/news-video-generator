import { describe, expect, it } from 'vitest'
import { scalePattern } from './scale'

describe('scalePattern', () => {
  it('tilts the beam positively when tiltDirection is left (the default)', () => {
    const scene = scalePattern({ narration: 'The court ruled.' })
    const beam = scene.actors.find((a) => a.id === 'scale-beam')!
    const finalKeyframe = beam.motion!.at(-1)!
    expect(finalKeyframe.rotationZ).toBeGreaterThan(0)
  })

  it('tilts the beam negatively when tiltDirection is right', () => {
    const scene = scalePattern({ narration: '', tiltDirection: 'right' })
    const beam = scene.actors.find((a) => a.id === 'scale-beam')!
    const finalKeyframe = beam.motion!.at(-1)!
    expect(finalKeyframe.rotationZ).toBeLessThan(0)
  })

  it('moves the left pan down and the right pan up when tilted left', () => {
    const scene = scalePattern({ narration: '', tiltDirection: 'left' })
    const left = scene.actors.find((a) => a.id === 'scale-pan-left')!
    const right = scene.actors.find((a) => a.id === 'scale-pan-right')!
    const leftEnd = left.motion!.at(-1)!.position[1]
    const rightEnd = right.motion!.at(-1)!.position[1]
    expect(leftEnd).toBeLessThan(rightEnd)
  })
})
