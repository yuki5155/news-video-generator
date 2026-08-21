import * as THREE from 'three'
import type { ReenactmentActor, ReenactmentScene } from '../schema/script'
import { createToonMaterial } from '../shared/toonMaterial'

export interface ReenactmentStage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  actors: THREE.Mesh[]
}

const SHAPE_GEOMETRY: Record<ReenactmentActor['shape'], () => THREE.BufferGeometry> = {
  box: () => new THREE.BoxGeometry(0.5, 0.5, 0.5),
  sphere: () => new THREE.SphereGeometry(0.3, 16, 16),
  capsule: () => new THREE.CapsuleGeometry(0.25, 0.5, 4, 8),
}

export function createReenactmentScene(def: ReenactmentScene): ReenactmentStage {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1117)

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), createToonMaterial(0x22262b))
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const key = new THREE.DirectionalLight(0xfff2e0, 1.2)
  key.position.set(3, 4, 2)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x89b4ff, 0.6)
  rim.position.set(-3, 2, -3)
  scene.add(rim)

  scene.add(new THREE.AmbientLight(0x404040, 0.5))

  const firstCameraPoint = def.cameraPath[0]
  if (!firstCameraPoint) {
    throw new Error('cameraPath must contain at least one point')
  }

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100)
  camera.position.set(...firstCameraPoint)
  // In the scene graph so objects parented to the camera (e.g. a telop) render.
  scene.add(camera)

  const actors = def.actors.map((actor) => {
    const geometry = SHAPE_GEOMETRY[actor.shape]()
    const mesh = new THREE.Mesh(geometry, createToonMaterial(actor.color))
    mesh.position.set(...actor.position)
    mesh.name = actor.id
    scene.add(mesh)
    return mesh
  })

  return { scene, camera, actors }
}
