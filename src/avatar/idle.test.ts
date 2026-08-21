import { describe, expect, it } from 'vitest'
import { blinkEyeOpenness, idleBreathBob, idleHeadYaw } from './idle'

describe('blinkEyeOpenness', () => {
  it('is open most of the time and dips to 0 mid-blink', () => {
    expect(blinkEyeOpenness(1)).toBe(1)
    expect(blinkEyeOpenness(0.07)).toBe(0)
  })

  it('is deterministic: the same time always yields the same value', () => {
    expect(blinkEyeOpenness(2.3)).toBe(blinkEyeOpenness(2.3))
  })
})

describe('idle motion', () => {
  it('yaw and bob are bounded, subtle oscillations', () => {
    for (const t of [0, 0.5, 1, 3.7, 10]) {
      expect(Math.abs(idleHeadYaw(t))).toBeLessThanOrEqual(0.05)
      expect(Math.abs(idleBreathBob(t))).toBeLessThanOrEqual(0.006)
    }
  })
})
