import * as THREE from 'three'
import { createToonMaterial } from '../shared/toonMaterial'
import { blinkEyeOpenness, idleBreathBob, idleHeadYaw } from './idle'

/**
 * Implemented by any announcer avatar (this stylized low-poly one, or a future
 * rigged/realistic replacement) so the lipsync driver and studio scene don't
 * care which is plugged in.
 */
export interface Avatar {
  group: THREE.Group
  setMouthOpenness(value: number): void
  /** Call once per rendered frame with the current playback time, in seconds, to drive blinking/idle motion. */
  update(timeSec: number): void
}

export function createAnnouncerAvatar(): Avatar {
  const group = new THREE.Group()

  const suitMat = createToonMaterial(0x2b3a4a)
  const tieMat = createToonMaterial(0x8c1f28)
  const skinMat = createToonMaterial(0xe0b090)
  const hairMat = createToonMaterial(0x2a2018)
  const eyeMat = createToonMaterial(0x1a1a1a)
  const mouthMat = createToonMaterial(0x3a1414)

  // Capsule top sits just under the chin (head bottom is at 1.55 - 0.22 = 1.33)
  // so the torso doesn't swallow the face.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 4, 8), suitMat)
  torso.position.y = 0.85
  torso.castShadow = true
  torso.receiveShadow = true
  group.add(torso)

  // z pushed just past the torso capsule's front surface (radius 0.26 at this
  // height) so the tie doesn't intersect/z-fight with the torso mesh.
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.02), tieMat)
  tie.position.set(0, 1.05, 0.29)
  tie.castShadow = true
  group.add(tie)

  // Forearms lying flat on the desk (assumed desk-top height ~0.85, matching
  // createStudioScene's desk), angled in toward the front-center. Previously
  // these stood upright with most of their length buried under the desk, so
  // only a rounded stub poked through the top — like hands growing out of
  // the table. Capsule's length axis is Y by default; rotating 90° about X
  // lays it flat with the length running front-to-back (Z).
  const armGeometry = new THREE.CapsuleGeometry(0.05, 0.32, 4, 8)
  const leftArm = new THREE.Mesh(armGeometry, suitMat)
  leftArm.position.set(-0.22, 0.9, 0.28)
  leftArm.rotation.set(Math.PI / 2, 0.18, 0)
  leftArm.castShadow = true
  leftArm.receiveShadow = true
  group.add(leftArm)
  const rightArm = leftArm.clone()
  rightArm.position.x = 0.22
  rightArm.rotation.y = -0.18
  group.add(rightArm)

  // Head and face parts live in their own group, positioned at the neck, so
  // idle head turns can rotate just the face without swinging the shoulders.
  const headGroup = new THREE.Group()
  headGroup.position.y = 1.55
  group.add(headGroup)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat)
  head.castShadow = true
  headGroup.add(head)

  // A shallow cap over just the crown of the head, standing in for hair, so it
  // doesn't cover the eyes/eyebrows.
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.4),
    hairMat,
  )
  hair.castShadow = true
  headGroup.add(hair)

  const eyeGeometry = new THREE.SphereGeometry(0.02, 8, 8)
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMat)
  leftEye.position.set(-0.08, 0.02, 0.19)
  headGroup.add(leftEye)
  const rightEye = leftEye.clone()
  rightEye.position.x = 0.08
  headGroup.add(rightEye)

  const browGeometry = new THREE.BoxGeometry(0.07, 0.015, 0.01)
  const leftBrow = new THREE.Mesh(browGeometry, hairMat)
  leftBrow.position.set(-0.08, 0.07, 0.195)
  headGroup.add(leftBrow)
  const rightBrow = leftBrow.clone()
  rightBrow.position.x = 0.08
  headGroup.add(rightBrow)

  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.03), mouthMat)
  mouth.position.set(0, -0.07, 0.205)
  headGroup.add(mouth)

  return {
    group,
    setMouthOpenness(value: number) {
      const clamped = Math.max(0, Math.min(1, value))
      mouth.scale.y = 1 + clamped * 2.5
    },
    update(timeSec: number) {
      const blink = Math.max(0.05, blinkEyeOpenness(timeSec))
      leftEye.scale.y = blink
      rightEye.scale.y = blink

      headGroup.rotation.y = idleHeadYaw(timeSec)
      group.position.y = idleBreathBob(timeSec)
    },
  }
}
