import { z } from 'zod'
import type { PositionKeyframeInput, ReenactmentSceneInput } from '../../schema/script'
import { ReenactmentSceneSchema } from '../../schema/script'
import type { ReenactmentPatternResolver } from './types'

/**
 * A shield built from two halves, seated together at rest, that crack apart
 * down the middle as a marker flies in and strikes the seam — e.g. for "a
 * phishing attempt succeeded" or "an unauthorized action went through"
 * beats. Simpler than `lock` (which it replaces): no pivot rotation, just
 * each half sliding outward and twisting slightly as it breaks off.
 */
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a #rrggbb color')

export const ShieldParamsSchema = z.object({
  narration: z.string(),
  shieldColor: hexColor.default('#3a6ea5'),
  breachColor: hexColor.default('#c0392b'),
})
export type ShieldParams = z.infer<typeof ShieldParamsSchema>
export type ShieldParamsInput = z.input<typeof ShieldParamsSchema>

export const SHIELD_LOOP_SEC = 3

const SHIELD_Y = 1.0
const HALF_WIDTH = 0.42
const CRACK_AT = 1.0
const HOLD_AT = 1.8

function halfMotion(sign: 1 | -1): PositionKeyframeInput[] {
  const restX = sign * HALF_WIDTH * 0.5
  const brokenX = sign * HALF_WIDTH * 1.6
  const rest: [number, number, number] = [restX, SHIELD_Y, 0]
  const broken: [number, number, number] = [brokenX, SHIELD_Y - 0.1, 0]
  return [
    { time: 0, position: rest, rotationZ: 0 },
    { time: CRACK_AT, position: rest, rotationZ: 0 },
    { time: HOLD_AT, position: broken, rotationZ: sign * 0.35 },
    { time: SHIELD_LOOP_SEC, position: broken, rotationZ: sign * 0.35 },
  ]
}

function intruderMotion(): PositionKeyframeInput[] {
  const offscreen: [number, number, number] = [2.2, SHIELD_Y, 0.7]
  const seam: [number, number, number] = [0, SHIELD_Y, 0.5]
  return [
    { time: 0, position: offscreen },
    { time: CRACK_AT, position: offscreen },
    { time: CRACK_AT + 0.3, position: seam },
    { time: SHIELD_LOOP_SEC, position: seam },
  ]
}

export const shieldPattern: ReenactmentPatternResolver<ShieldParamsInput> = (paramsInput) => {
  const params = ShieldParamsSchema.parse(paramsInput)

  const scene: ReenactmentSceneInput = {
    type: 'reenactment',
    narration: params.narration,
    actors: [
      {
        id: 'shield-left',
        shape: 'box',
        color: params.shieldColor,
        position: [-HALF_WIDTH * 0.5, SHIELD_Y, 0],
        scale: [HALF_WIDTH, 1.0, 0.22],
        motion: halfMotion(-1),
      },
      {
        id: 'shield-right',
        shape: 'box',
        color: params.shieldColor,
        position: [HALF_WIDTH * 0.5, SHIELD_Y, 0],
        scale: [HALF_WIDTH, 1.0, 0.22],
        motion: halfMotion(1),
      },
      {
        id: 'intruder',
        shape: 'sphere',
        color: params.breachColor,
        position: [2.2, SHIELD_Y, 0.7],
        scale: [0.26, 0.26, 0.26],
        motion: intruderMotion(),
      },
    ],
    cameraPath: [
      { time: 0, position: [0, 1.3, 3.2] },
      { time: SHIELD_LOOP_SEC, position: [0, 1.3, 3.2] },
    ],
  }
  return ReenactmentSceneSchema.parse(scene)
}
