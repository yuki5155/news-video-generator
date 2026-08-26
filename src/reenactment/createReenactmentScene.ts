import * as THREE from 'three'
import type { ReenactmentActor, ReenactmentScene } from '../schema/script'
import { createToonMaterial } from '../shared/toonMaterial'
import { interpolatePosition, interpolateRotationZ } from '../shared/keyframes'

export interface ReenactmentStage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  actors: THREE.Object3D[]
  /**
   * Call once per rendered frame with the current scene playback time, in
   * seconds, to move the camera along `cameraPath` and any actor that has a
   * `motion` timeline. Actors without `motion` stay at their static position.
   */
  update(currentTimeSec: number): void
}

type PrimitiveShape = 'box' | 'sphere' | 'capsule'

const SHAPE_GEOMETRY: Record<PrimitiveShape, () => THREE.BufferGeometry> = {
  box: () => new THREE.BoxGeometry(0.5, 0.5, 0.5),
  sphere: () => new THREE.SphereGeometry(0.3, 16, 16),
  capsule: () => new THREE.CapsuleGeometry(0.25, 0.5, 4, 8),
}

const WHEEL_COLOR = '#1a1a1a'

function withShadows(group: THREE.Group): THREE.Group {
  for (const child of group.children) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  }
  return group
}

/** Body + cabin + four wheels, sized and grounded so the whole group's origin sits at y=0. */
function buildVehicleObject(color: THREE.ColorRepresentation): THREE.Object3D {
  const group = new THREE.Group()
  const bodyMaterial = createToonMaterial(color)

  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 0.5), bodyMaterial)
  body.position.y = 0.295
  group.add(body)

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.44), bodyMaterial)
  cabin.position.y = 0.595
  group.add(cabin)

  const wheelGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12)
  const wheelMaterial = createToonMaterial(WHEEL_COLOR)
  for (const x of [0.38, -0.38]) {
    for (const z of [0.27, -0.27]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, 0.11, z)
      group.add(wheel)
    }
  }

  return withShadows(group)
}

/** Legs + torso + head, sized and grounded so the whole group's origin sits at y=0. */
function buildPersonObject(color: THREE.ColorRepresentation): THREE.Object3D {
  const group = new THREE.Group()
  const material = createToonMaterial(color)

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 8), material)
  legs.position.y = 0.25
  group.add(legs)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.25, 4, 8), material)
  torso.position.y = 0.75
  group.add(torso)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), material)
  head.position.y = 1.13
  group.add(head)

  return withShadows(group)
}

function buildActorObject(actor: ReenactmentActor): THREE.Object3D {
  if (actor.shape === 'vehicle') return buildVehicleObject(actor.color)
  if (actor.shape === 'person') return buildPersonObject(actor.color)

  const geometry = SHAPE_GEOMETRY[actor.shape]()
  const mesh = new THREE.Mesh(geometry, createToonMaterial(actor.color))
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function createReenactmentScene(def: ReenactmentScene): ReenactmentStage {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1117)

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), createToonMaterial(0x22262b))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Shadows only render once the consumer's renderer opts in:
  // `renderer.shadowMap.enabled = true`.
  const key = new THREE.DirectionalLight(0xfff2e0, 1.2)
  key.position.set(3, 4, 2)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -6
  key.shadow.camera.right = 6
  key.shadow.camera.top = 6
  key.shadow.camera.bottom = -6
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 15
  key.shadow.bias = -0.0015
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x89b4ff, 0.6)
  rim.position.set(-3, 2, -3)
  scene.add(rim)

  scene.add(new THREE.AmbientLight(0x404040, 0.5))

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100)
  camera.position.set(...interpolatePosition(def.cameraPath, 0))
  // In the scene graph so objects parented to the camera (e.g. a telop) render.
  scene.add(camera)

  const movingActors: { actor: ReenactmentActor; object: THREE.Object3D }[] = []

  const actors = def.actors.map((actor) => {
    const object = buildActorObject(actor)
    object.position.set(...(actor.motion ? interpolatePosition(actor.motion, 0) : actor.position))
    object.rotation.z = actor.motion ? interpolateRotationZ(actor.motion, 0) : 0
    object.scale.set(...actor.scale)
    object.name = actor.id
    scene.add(object)
    if (actor.motion) movingActors.push({ actor, object })
    return object
  })

  return {
    scene,
    camera,
    actors,
    update(currentTimeSec: number) {
      camera.position.set(...interpolatePosition(def.cameraPath, currentTimeSec))
      for (const { actor, object } of movingActors) {
        object.position.set(...interpolatePosition(actor.motion!, currentTimeSec))
        object.rotation.z = interpolateRotationZ(actor.motion!, currentTimeSec)
      }
    },
  }
}
