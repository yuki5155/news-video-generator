import * as THREE from 'three'
import { createToonMaterial } from '../shared/toonMaterial'

export interface Monitor {
  /** Bezel + screen, add to a scene at the desired position. */
  object: THREE.Group
  /** Sets which image the screen would show; pass null to clear it. Doesn't affect whether it's currently on-screen — see setImageVisible. */
  setImage(texture: THREE.Texture | null): void
  /** Toggles between showing the set image and an idle (blank) screen. */
  setImageVisible(visible: boolean): void
  isImageVisible(): boolean
}

export interface MonitorOptions {
  /** World-unit width of the screen (bezel is slightly larger). Height follows a 16:9 ratio unless given. */
  width?: number
  height?: number
}

const IDLE_SCREEN_COLOR = 0x2a4a66
const BEZEL_COLOR = 0x10151a
const BEZEL_MARGIN = 0.12

export function createMonitor(options: MonitorOptions = {}): Monitor {
  const width = options.width ?? 2.16
  const height = options.height ?? width * (9 / 16)

  const group = new THREE.Group()

  const bezel = new THREE.Mesh(
    new THREE.PlaneGeometry(width + BEZEL_MARGIN, height + BEZEL_MARGIN),
    createToonMaterial(BEZEL_COLOR),
  )
  bezel.position.z = -0.01
  group.add(bezel)

  // Unlit (MeshBasicMaterial): a screen displays its own content regardless
  // of the studio's lighting, so it shouldn't be cel-shaded like a physical prop.
  const idleMaterial = new THREE.MeshBasicMaterial({ color: IDLE_SCREEN_COLOR })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), idleMaterial)
  group.add(screen)

  let imageMaterial: THREE.MeshBasicMaterial | null = null
  let imageVisible = false

  function applyScreenMaterial() {
    screen.material = imageVisible && imageMaterial ? imageMaterial : idleMaterial
  }

  return {
    object: group,
    setImage(texture: THREE.Texture | null) {
      imageMaterial?.dispose()
      imageMaterial = texture ? new THREE.MeshBasicMaterial({ map: texture }) : null
      if (!texture) imageVisible = false
      applyScreenMaterial()
    },
    setImageVisible(visible: boolean) {
      imageVisible = visible
      applyScreenMaterial()
    },
    isImageVisible() {
      return imageVisible && imageMaterial !== null
    },
  }
}
