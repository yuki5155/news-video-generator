import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createMonitor } from './createMonitor'

function fakeTexture(): THREE.Texture {
  return new THREE.Texture()
}

describe('createMonitor', () => {
  it('starts with the image hidden even after setImage', () => {
    const monitor = createMonitor()
    expect(monitor.isImageVisible()).toBe(false)

    monitor.setImage(fakeTexture())
    expect(monitor.isImageVisible()).toBe(false)
  })

  it('shows the image only once both an image is set and made visible', () => {
    const monitor = createMonitor()

    monitor.setImageVisible(true)
    expect(monitor.isImageVisible()).toBe(false) // no image set yet

    monitor.setImage(fakeTexture())
    monitor.setImageVisible(true)
    expect(monitor.isImageVisible()).toBe(true)

    monitor.setImageVisible(false)
    expect(monitor.isImageVisible()).toBe(false)
  })

  it('reverts to the idle screen when the image is cleared', () => {
    const monitor = createMonitor()
    monitor.setImage(fakeTexture())
    monitor.setImageVisible(true)
    expect(monitor.isImageVisible()).toBe(true)

    monitor.setImage(null)
    expect(monitor.isImageVisible()).toBe(false)
  })

  it('sizes the bezel slightly larger than the screen, and the screen 16:9 by default', () => {
    const monitor = createMonitor()
    const [bezel, screen] = monitor.object.children as THREE.Mesh[]
    const bezelParams = (bezel!.geometry as THREE.PlaneGeometry).parameters
    const screenParams = (screen!.geometry as THREE.PlaneGeometry).parameters

    expect(bezelParams.width).toBeGreaterThan(screenParams.width)
    expect(bezelParams.height).toBeGreaterThan(screenParams.height)
    expect(screenParams.width / screenParams.height).toBeCloseTo(16 / 9, 2)
  })
})
