import * as THREE from 'three'
import {
  createBackdropTexture,
  createDeskTopTexture,
  createToonMaterial,
  toonGradientMap,
} from '../shared/toonMaterial'

export interface StudioStage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  desk: THREE.Mesh
}

export function createStudioScene(): StudioStage {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0d12)

  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100)
  camera.position.set(0, 1.6, 3.2)
  camera.lookAt(0, 1.4, 0)
  // In the scene graph (not just returned) so objects parented to the camera
  // (e.g. a telop from createTelop) are reachable during rendering.
  scene.add(camera)

  const key = new THREE.DirectionalLight(0xfff2e0, 1.4)
  key.position.set(2, 3, 2)
  scene.add(key)

  // Cool rim light from behind to separate the announcer's silhouette from the backdrop.
  const rim = new THREE.DirectionalLight(0x89b4ff, 0.8)
  rim.position.set(-2, 2, -3)
  scene.add(rim)

  scene.add(new THREE.AmbientLight(0x404040, 0.5))

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.MeshToonMaterial({ map: createBackdropTexture(), gradientMap: toonGradientMap() }),
  )
  backdrop.position.set(0, 2.5, -2)
  scene.add(backdrop)

  // A monitor-style panel: a dark bezel with a lit "screen" inset on top of it.
  const panelBezel = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.02), createToonMaterial(0x10151a))
  panelBezel.position.set(0, 2.8, -1.99)
  scene.add(panelBezel)

  const accentPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), createToonMaterial(0x2a4a66))
  accentPanel.position.set(0, 2.8, -1.98)
  scene.add(accentPanel)

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), createToonMaterial(0x14181d))
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // Shorter than a real desk so the announcer's shoulders, tie, and arms stay in view.
  // Multi-material box: a brushed/glossy top face, plain toon sides, so it
  // reads as a lacquered studio desk rather than a solid-color block.
  const deskSideMat = createToonMaterial(0x2b2f38)
  const deskTopMat = new THREE.MeshToonMaterial({
    map: createDeskTopTexture(),
    gradientMap: toonGradientMap(),
  })
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.8), [
    deskSideMat,
    deskSideMat,
    deskTopMat,
    deskSideMat,
    deskSideMat,
    deskSideMat,
  ])
  desk.position.set(0, 0.5, 0.4)
  scene.add(desk)

  // A backlit accent strip on the desk's front face, like a real broadcast desk.
  // y=0.6 keeps it within the camera's view — the desk's lower half (below
  // about y=0.45 at this depth) falls outside the frustum at this camera angle.
  const deskAccent = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.08), createToonMaterial(0x2a4a66))
  deskAccent.position.set(0, 0.6, 0.81)
  scene.add(deskAccent)

  // A classic desk mic: dark stand + foam windscreen, low enough to stay out
  // of the announcer's face, offset so it doesn't sit dead-center.
  const micStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8),
    createToonMaterial(0x14181d),
  )
  micStand.position.set(-0.18, 0.96, 0.5)
  scene.add(micStand)

  const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), createToonMaterial(0xd9d9d9))
  micHead.position.set(-0.18, 1.105, 0.5)
  scene.add(micHead)

  return { scene, camera, desk }
}
