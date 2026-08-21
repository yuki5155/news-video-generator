import * as THREE from 'three'

let sharedGradientMap: THREE.DataTexture | null = null

/**
 * A small stepped gradient shared by every toon material in this library, so
 * everything cel-shades with the same number of tone bands. Built procedurally
 * (no image asset) to keep this package dependency- and asset-free.
 */
export function toonGradientMap(): THREE.DataTexture {
  if (sharedGradientMap) return sharedGradientMap

  const steps = new Uint8Array([80, 170, 255])
  const texture = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true

  sharedGradientMap = texture
  return texture
}

export function createToonMaterial(color: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradientMap() })
}

/**
 * A subtle gradient + grid backdrop texture, generated as raw pixel data
 * (not a DOM canvas) so it works in both browser and Node/vitest.
 */
export function createBackdropTexture(width = 128, height = 64): THREE.DataTexture {
  const data = new Uint8ClampedArray(width * height * 4)
  const top = [28, 39, 51]
  const bottom = [13, 19, 25]

  for (let y = 0; y < height; y++) {
    const t = y / (height - 1)
    const onGridLine = y % 32 === 0
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const verticalLine = x % 32 === 0
      const boost = onGridLine || verticalLine ? 10 : 0
      data[idx] = top[0]! + (bottom[0]! - top[0]!) * t + boost
      data[idx + 1] = top[1]! + (bottom[1]! - top[1]!) * t + boost
      data[idx + 2] = top[2]! + (bottom[2]! - top[2]!) * t + boost
      data[idx + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.needsUpdate = true
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  return texture
}

/**
 * A brushed/glossy desk-top texture: faint horizontal streaks plus a soft
 * lightening toward the front edge, so a flat toon box reads as a lacquered
 * studio desk instead of a solid-color block.
 */
export function createDeskTopTexture(width = 64, height = 64): THREE.DataTexture {
  const data = new Uint8ClampedArray(width * height * 4)
  const base = [42, 46, 54]

  for (let y = 0; y < height; y++) {
    const frontGlow = (y / (height - 1)) * 16
    const streak = Math.sin(y * 1.3) * 4
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      data[idx] = base[0]! + streak + frontGlow
      data[idx + 1] = base[1]! + streak + frontGlow
      data[idx + 2] = base[2]! + streak + frontGlow
      data[idx + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.needsUpdate = true
  return texture
}
