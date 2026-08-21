import * as THREE from 'three'

export interface Telop {
  /** Add this to a camera (HUD, stays fixed on screen) or to a scene (world-space). */
  object: THREE.Object3D
  setText(text: string): void
  setVisible(visible: boolean): void
  isVisible(): boolean
}

/** The minimal canvas surface this needs — narrower than HTMLCanvasElement so tests can inject a stub. */
interface CanvasLike {
  width: number
  height: number
  getContext(contextId: '2d'): CanvasRenderingContext2D | null
}

export interface TelopOptions {
  width?: number
  height?: number
  /** Injectable so this is unit-testable without a browser DOM; defaults to a real `<canvas>`. */
  createCanvas?: () => CanvasLike
}

const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 140

function defaultCreateCanvas(): CanvasLike {
  if (typeof document === 'undefined') {
    throw new Error(
      'createTelop() needs a browser DOM canvas to render text; pass options.createCanvas in non-browser environments (e.g. tests)',
    )
  }
  return document.createElement('canvas')
}

function draw(canvas: CanvasLike, text: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(10, 14, 20, 0.82)'
  ctx.fillRect(0, 0, width, height)

  // Accent stripe on the left edge, matching the studio's monitor/desk accent color.
  ctx.fillStyle = '#2a4a66'
  ctx.fillRect(0, 0, width * 0.012, height)

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(height * 0.42)}px sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width * 0.04, height * 0.52)
}

/**
 * A broadcast-style lower-third caption (テロップ). Returns a plane you attach
 * yourself — `camera.add(telop.object)` to keep it fixed on screen regardless
 * of camera movement, or `scene.add(telop.object)` to place it in world space.
 */
export function createTelop(text = '', options: TelopOptions = {}): Telop {
  const width = options.width ?? DEFAULT_WIDTH
  const height = options.height ?? DEFAULT_HEIGHT
  const createCanvas = options.createCanvas ?? defaultCreateCanvas

  const canvas = createCanvas()
  canvas.width = width
  canvas.height = height
  draw(canvas, text)

  const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement)
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false })
  const geometry = new THREE.PlaneGeometry(2.1, (2.1 * height) / width)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = 999
  // Default position assumes this is attached to a camera as a HUD element:
  // low in frame, just in front of the near plane.
  mesh.position.set(0, -0.47, -1.6)

  return {
    object: mesh,
    setText(next: string) {
      draw(canvas, next)
      texture.needsUpdate = true
    },
    setVisible(visible: boolean) {
      mesh.visible = visible
    },
    isVisible() {
      return mesh.visible
    },
  }
}
