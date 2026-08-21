import * as THREE from 'three'
import {
  createBackdropTexture,
  createDeskTopTexture,
  createToonMaterial,
  toonGradientMap,
} from '../shared/toonMaterial'
import { createMonitor, type Monitor } from './createMonitor'

export interface StudioStage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  desk: THREE.Mesh
  monitor: Monitor
}

/**
 * Builds the studio set. Objects are marked castShadow/receiveShadow, but
 * shadows only actually render once the consumer's renderer opts in:
 * `renderer.shadowMap.enabled = true` (and typically
 * `renderer.shadowMap.type = THREE.PCFSoftShadowMap`).
 */
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
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -3
  key.shadow.camera.right = 3
  key.shadow.camera.top = 3
  key.shadow.camera.bottom = -3
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 10
  key.shadow.bias = -0.0015
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
  backdrop.receiveShadow = true
  scene.add(backdrop)

  // Side walls closing the back wall's edges into an actual room corner (a
  // simple box set), instead of the back wall floating in empty space.
  // x is well inside the backdrop's own extent (not flush with its x=±5
  // edge) because the camera's horizontal FOV only reaches about ±3.8 world
  // units at this depth — anything further out falls outside the frustum
  // and would never be seen at all.
  const sideWallMaterial = createToonMaterial(0x333d49)
  const sideWallGeometry = new THREE.PlaneGeometry(2.5, 5)
  const leftWall = new THREE.Mesh(sideWallGeometry, sideWallMaterial)
  leftWall.position.set(-3.3, 2.5, -1)
  leftWall.rotation.y = Math.PI / 2
  leftWall.receiveShadow = true
  scene.add(leftWall)
  const rightWall = leftWall.clone()
  rightWall.position.x = 3.3
  rightWall.rotation.y = -Math.PI / 2
  scene.add(rightWall)

  // A wall-mounted monitor that can show/hide an image (e.g. a news graphic).
  const monitor = createMonitor({ width: 2.4 })
  monitor.object.position.set(0, 2.55, -1.98)
  scene.add(monitor.object)

  // Two smaller flanking screens, angled inward, for a video-wall look —
  // decorative (always idle), unlike the main monitor's image toggle.
  const leftScreen = createMonitor({ width: 0.75 })
  leftScreen.object.position.set(-1.7, 2.5, -2.05)
  leftScreen.object.rotation.y = 0.3
  scene.add(leftScreen.object)

  const rightScreen = createMonitor({ width: 0.75 })
  rightScreen.object.position.set(1.7, 2.5, -2.05)
  rightScreen.object.rotation.y = -0.3
  scene.add(rightScreen.object)

  // Backlit accent pillars flanking the video wall, like a modern studio's
  // architectural lighting. Unlit (self-glowing), like the monitor screens.
  const accentPillarGeometry = new THREE.PlaneGeometry(0.05, 3.0)
  const accentPillarMaterial = new THREE.MeshBasicMaterial({ color: 0x3a6a8a })
  const leftPillar = new THREE.Mesh(accentPillarGeometry, accentPillarMaterial)
  leftPillar.position.set(-1.4, 2.5, -1.97)
  scene.add(leftPillar)
  const rightPillar = leftPillar.clone()
  rightPillar.position.x = 1.4
  scene.add(rightPillar)

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), createToonMaterial(0x14181d))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
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
  desk.castShadow = true
  desk.receiveShadow = true
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
  micStand.castShadow = true
  scene.add(micStand)

  const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), createToonMaterial(0xd9d9d9))
  micHead.position.set(-0.18, 1.105, 0.5)
  micHead.castShadow = true
  scene.add(micHead)

  return { scene, camera, desk, monitor }
}
