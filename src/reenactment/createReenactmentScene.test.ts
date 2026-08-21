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
        [0, 1.5, 4],
        [1, 1.5, 3],
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
})
