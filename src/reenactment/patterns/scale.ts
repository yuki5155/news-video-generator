import { z } from 'zod'
import type { PositionKeyframeInput, ReenactmentSceneInput } from '../../schema/script'
import { ReenactmentSceneSchema } from '../../schema/script'
import type { ReenactmentPatternResolver } from './types'

/**
 * A courtroom scale of justice tipping to one side, in front of a judge —
 * e.g. for "the court ruled for/against ..." beats. Built entirely from the
 * standard per-actor position+rotationZ motion (the same mechanism this
 * pattern's `trafficAccident` sibling uses for its falling pedestrian) —
 * no bespoke rendering code needed.
 */
export const ScaleParamsSchema = z.object({
  narration: z.string(),
  /** Which pan sinks — i.e. which side the ruling "weighs down." Defaults to 'left'. */
  tiltDirection: z.enum(['left', 'right']).default('left'),
})
export type ScaleParams = z.infer<typeof ScaleParamsSchema>
export type ScaleParamsInput = z.input<typeof ScaleParamsSchema>

export const SCALE_LOOP_SEC = 3

const SCALE_X = -1.3
const SCALE_Z = 0.5
const SCALE_BEAM_Y = 1.9
const SCALE_BEAM_HALF_LEN = 0.5
const SCALE_PAN_DROP = 0.08
const SCALE_TILT_MAGNITUDE = 0.4

// Beam and pans all pivot together around the beam's own center — but
// ReenactmentActor motion is independent per actor (no parent/child), so
// each pan's keyframe positions are precomputed by rotating its rest offset
// by the same angle the beam uses at that moment, via the standard 2D
// rotation matrix.
function rotateZ(x: number, y: number, angle: number): [number, number] {
  return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]
}

function panMotion(localX: number, tiltEnd: number): PositionKeyframeInput[] {
  const [restX, restY] = rotateZ(localX, -SCALE_PAN_DROP, 0)
  const [tiltX, tiltY] = rotateZ(localX, -SCALE_PAN_DROP, tiltEnd)
  const rest: [number, number, number] = [SCALE_X + restX, SCALE_BEAM_Y + restY, SCALE_Z]
  const tilted: [number, number, number] = [SCALE_X + tiltX, SCALE_BEAM_Y + tiltY, SCALE_Z]
  return [
    { time: 0, position: rest },
    { time: 1.2, position: tilted },
    { time: SCALE_LOOP_SEC, position: tilted },
  ]
}

export const scalePattern: ReenactmentPatternResolver<ScaleParamsInput> = (paramsInput) => {
  const params = ScaleParamsSchema.parse(paramsInput)
  const tiltEnd = params.tiltDirection === 'left' ? SCALE_TILT_MAGNITUDE : -SCALE_TILT_MAGNITUDE

  const scene: ReenactmentSceneInput = {
    type: 'reenactment',
    narration: params.narration,
    actors: [
      { id: 'judge', shape: 'person', color: '#5a6a80', position: [0, 0.25, -0.3], scale: [1.15, 1.15, 1.15] },
      { id: 'bench', shape: 'box', color: '#7a5535', position: [0, 0.7, 0.4], scale: [2.2, 0.9, 1] },
      {
        id: 'scale-stand',
        shape: 'capsule',
        color: '#6b7078',
        position: [SCALE_X, 1.5, SCALE_Z],
        scale: [0.15, 0.8, 0.15],
      },
      {
        id: 'scale-beam',
        shape: 'box',
        color: '#8a8f99',
        position: [SCALE_X, SCALE_BEAM_Y, SCALE_Z],
        scale: [SCALE_BEAM_HALF_LEN * 2, 0.06, 0.15],
        motion: [
          { time: 0, position: [SCALE_X, SCALE_BEAM_Y, SCALE_Z], rotationZ: 0 },
          { time: 1.2, position: [SCALE_X, SCALE_BEAM_Y, SCALE_Z], rotationZ: tiltEnd },
          { time: SCALE_LOOP_SEC, position: [SCALE_X, SCALE_BEAM_Y, SCALE_Z], rotationZ: tiltEnd },
        ],
      },
      {
        id: 'scale-pan-left',
        shape: 'sphere',
        color: '#c9a24c',
        position: [SCALE_X - SCALE_BEAM_HALF_LEN, SCALE_BEAM_Y - SCALE_PAN_DROP, SCALE_Z],
        scale: [0.4, 0.4, 0.4],
        motion: panMotion(-SCALE_BEAM_HALF_LEN, tiltEnd),
      },
      {
        id: 'scale-pan-right',
        shape: 'sphere',
        color: '#c9a24c',
        position: [SCALE_X + SCALE_BEAM_HALF_LEN, SCALE_BEAM_Y - SCALE_PAN_DROP, SCALE_Z],
        scale: [0.4, 0.4, 0.4],
        motion: panMotion(SCALE_BEAM_HALF_LEN, tiltEnd),
      },
    ],
    cameraPath: [
      { time: 0, position: [-0.5, 1.5, 3.6] },
      { time: SCALE_LOOP_SEC, position: [-0.5, 1.5, 3.6] },
    ],
  }
  return ReenactmentSceneSchema.parse(scene)
}
