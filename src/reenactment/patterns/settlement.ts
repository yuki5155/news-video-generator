import { z } from 'zod'
import type { PositionKeyframeInput, ReenactmentSceneInput } from '../../schema/script'
import { ReenactmentSceneSchema } from '../../schema/script'
import type { ReenactmentPatternResolver } from './types'

/**
 * Cash bundles handed from one party to another — a generic "settlement /
 * payment" beat (e.g. a lawsuit settlement, an acquisition payout), not
 * specific to any one story.
 */
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'expected a #rrggbb color')

export const SettlementParamsSchema = z.object({
  narration: z.string(),
  /** How many cash bundles change hands per loop. Defaults to 3. */
  cashCount: z.number().int().min(1).max(5).default(3),
  payerColor: hexColor.default('#2b3a4a'),
  payeeColor: hexColor.default('#7a5a3a'),
})
export type SettlementParams = z.infer<typeof SettlementParamsSchema>
export type SettlementParamsInput = z.input<typeof SettlementParamsSchema>

export const SETTLEMENT_LOOP_SEC = 3

const CASH_START: [number, number, number] = [-0.9, 0.9, 0]
const CASH_END: [number, number, number] = [0.9, 0.9, 0]
const CASH_COLORS = ['#3a8f4f', '#2f7d3f']

function buildCashMotion(arriveAt: number, flightSec: number): PositionKeyframeInput[] {
  const departAt = Math.max(0, arriveAt - flightSec)
  return [
    { time: departAt, position: CASH_START },
    { time: arriveAt, position: CASH_END },
  ]
}

export const settlementPattern: ReenactmentPatternResolver<SettlementParamsInput> = (paramsInput) => {
  const params = SettlementParamsSchema.parse(paramsInput)
  const flightSec = 0.9
  const arrivalSpan = SETTLEMENT_LOOP_SEC - 0.8

  const actors: ReenactmentSceneInput['actors'] = [
    { id: 'payer', shape: 'person', color: params.payerColor, position: [-1.3, 0, 0] },
    { id: 'payee', shape: 'person', color: params.payeeColor, position: [1.3, 0, 0] },
  ]
  for (let i = 0; i < params.cashCount; i++) {
    const arriveAt = 1.0 + (arrivalSpan * i) / params.cashCount
    actors.push({
      id: `cash-${i}`,
      shape: 'box',
      color: CASH_COLORS[i % CASH_COLORS.length]!,
      position: CASH_START,
      scale: [0.7, 0.24, 0.44],
      motion: buildCashMotion(arriveAt, flightSec),
    })
  }

  const scene: ReenactmentSceneInput = {
    type: 'reenactment',
    narration: params.narration,
    actors,
    cameraPath: [
      { time: 0, position: [0, 1.3, 3.1] },
      { time: SETTLEMENT_LOOP_SEC, position: [0, 1.3, 3.1] },
    ],
  }
  return ReenactmentSceneSchema.parse(scene)
}
