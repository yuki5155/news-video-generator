import { describe, expect, it } from 'vitest'
import { createReenactmentScene } from './createReenactmentScene'
import { ReenactmentSceneSchema } from '../schema/script'

describe('createReenactmentScene', () => {
  it('builds one mesh per actor and positions the camera at the first path point', () => {
    const def = ReenactmentSceneSchema.parse({
      type: 'reenactment',
      narration: 'A car ran the red light.',
      actors: [
        { id: 'car', shape: 'box', color: '#cc3333', position: [0, 0.25, 1] },
        { id: 'pedestrian', shape: 'capsule', position: [2, 0.5, 0] },
      ],
      cameraPath: [
        { time: 0, position: [0, 1.5, 4] },
        { time: 1, position: [0, 1.5, 3] },
      ],
    })

    const stage = createReenactmentScene(def)

    expect(stage.actors).toHaveLength(2)
    expect(stage.camera.position.toArray()).toEqual([0, 1.5, 4])
  })

  it('throws when cameraPath is empty', () => {
    expect(() =>
      createReenactmentScene({ type: 'reenactment', narration: '', actors: [], cameraPath: [] as never }),
    ).toThrow()
  })

  it('moves the camera along cameraPath and actors along their motion on update()', () => {
    const def = ReenactmentSceneSchema.parse({
      type: 'reenactment',
      narration: 'A car ran the red light.',
      actors: [
        {
          id: 'car',
          shape: 'box',
          position: [0, 0.25, 1],
          motion: [
            { time: 0, position: [-2, 0.25, 1] },
            { time: 2, position: [2, 0.25, 1] },
          ],
        },
        { id: 'bystander', shape: 'capsule', position: [3, 0.5, 0] },
      ],
      cameraPath: [
        { time: 0, position: [0, 1.5, 4] },
        { time: 2, position: [0, 1.5, 2] },
      ],
    })

    const stage = createReenactmentScene(def)
    stage.update(1)

    expect(stage.camera.position.toArray()).toEqual([0, 1.5, 3])
    expect(stage.actors[0]?.position.toArray()).toEqual([0, 0.25, 1])
    // Actor with no `motion` stays put regardless of playback time.
    expect(stage.actors[1]?.position.toArray()).toEqual([3, 0.5, 0])
  })

  it('builds composite multi-part objects for vehicle/person shapes, not a single primitive', () => {
    const def = ReenactmentSceneSchema.parse({
      type: 'reenactment',
      narration: '',
      actors: [
        { id: 'car', shape: 'vehicle', position: [0, 0, 0] },
        { id: 'walker', shape: 'person', position: [1, 0, 0] },
      ],
      cameraPath: [{ time: 0, position: [0, 1.5, 4] }],
    })

    const stage = createReenactmentScene(def)

    // A plain box/capsule actor is a single Mesh with no children; vehicle/person
    // are Groups assembled from several parts (body+cabin+wheels, head+torso+legs).
    expect(stage.actors[0]?.children.length).toBeGreaterThan(1)
    expect(stage.actors[1]?.children.length).toBeGreaterThan(1)
  })

  it('tips an actor over as it moves through motion keyframes with rotationZ', () => {
    const def = ReenactmentSceneSchema.parse({
      type: 'reenactment',
      narration: '',
      actors: [
        {
          id: 'walker',
          shape: 'person',
          position: [0, 0, 0],
          motion: [
            { time: 0, position: [0, 0, 0], rotationZ: 0 },
            { time: 2, position: [1, 0, 0], rotationZ: Math.PI / 2 },
          ],
        },
      ],
      cameraPath: [{ time: 0, position: [0, 1.5, 4] }],
    })

    const stage = createReenactmentScene(def)
    expect(stage.actors[0]?.rotation.z).toBe(0)

    stage.update(1)
    expect(stage.actors[0]?.rotation.z).toBeCloseTo(Math.PI / 4)

    stage.update(2)
    expect(stage.actors[0]?.rotation.z).toBeCloseTo(Math.PI / 2)
  })
})
