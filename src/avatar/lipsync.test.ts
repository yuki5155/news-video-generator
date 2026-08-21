import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import type { Avatar } from './createAnnouncerAvatar'
import { driveLipsync, visemeOpenness } from './lipsync'

function fakeAvatar(): Avatar & { setMouthOpenness: ReturnType<typeof vi.fn> } {
  return { group: new THREE.Group(), setMouthOpenness: vi.fn(), update: vi.fn() }
}

describe('driveLipsync', () => {
  it('applies the cue that is active at the given time, not a later one', () => {
    const avatar = fakeAvatar()
    const driver = driveLipsync(avatar, [
      { time: 0, viseme: 'sil' },
      { time: 1, viseme: 'a' },
    ])

    driver.update(0.5)
    expect(avatar.setMouthOpenness).toHaveBeenCalledWith(visemeOpenness('sil'))

    driver.update(1.5)
    expect(avatar.setMouthOpenness).toHaveBeenCalledWith(visemeOpenness('a'))
  })

  it('reports closed before the first cue', () => {
    const avatar = fakeAvatar()
    const driver = driveLipsync(avatar, [{ time: 1, viseme: 'a' }])

    driver.update(0)
    expect(avatar.setMouthOpenness).toHaveBeenCalledWith(0)
  })

  it('falls back to a default openness for unknown visemes', () => {
    expect(visemeOpenness('unknown-code')).toBe(0.4)
  })
})
