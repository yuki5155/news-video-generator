import { z } from 'zod'
import type { PositionKeyframeInput, ReenactmentSceneInput } from '../../schema/script'
import { ReenactmentSceneSchema } from '../../schema/script'
import type { ReenactmentPatternResolver } from './types'

/**
 * A person's data (thin cards — mail/calendar/docs) streaming out of them
 * into an AI core, staggered and looped like `books` — but framed around a
 * data *owner* rather than a library, for "the assistant reads your inbox /
 * calendar / location" beats.
 */
export const DataAccessParamsSchema = z.object({
  narration: z.string(),
  /** How many data cards fly into the AI core per loop. Defaults to 4. */
  itemCount: z.number().int().min(1).max(6).default(4),
})
export type DataAccessParams = z.infer<typeof DataAccessParamsSchema>
export type DataAccessParamsInput = z.input<typeof DataAccessParamsSchema>

export const DATA_ACCESS_LOOP_SEC = 4

const PERSON_POSITION: [number, number, number] = [-1.6, 0, 0]
const AI_CORE_POSITION: [number, number, number] = [1.0, 1.0, 0]
const CARD_START: [number, number, number] = [-1.2, 1.1, 0]
const CARD_COLORS = ['#4fa3c9', '#3d84a8', '#6fc0e0', '#2f6b87']

function buildCardMotion(arriveAt: number, flightSec: number): PositionKeyframeInput[] {
  const departAt = Math.max(0, arriveAt - flightSec)
  return [
    { time: departAt, position: CARD_START },
    { time: arriveAt, position: AI_CORE_POSITION },
  ]
}

export const dataAccessPattern: ReenactmentPatternResolver<DataAccessParamsInput> = (paramsInput) => {
  const params = DataAccessParamsSchema.parse(paramsInput)
  const flightSec = 1.1
  const arrivalSpan = DATA_ACCESS_LOOP_SEC - 0.7

  const actors: ReenactmentSceneInput['actors'] = [
    { id: 'data-owner', shape: 'person', color: '#5a6a80', position: PERSON_POSITION },
    { id: 'ai-core', shape: 'sphere', color: '#8a5fd0', position: AI_CORE_POSITION, scale: [1.6, 1.6, 1.6] },
  ]
  for (let i = 0; i < params.itemCount; i++) {
    const arriveAt = 1.0 + (arrivalSpan * i) / params.itemCount
    actors.push({
      id: `data-card-${i}`,
      shape: 'box',
      color: CARD_COLORS[i % CARD_COLORS.length]!,
      position: CARD_START,
      scale: [0.55, 0.06, 0.75],
      motion: buildCardMotion(arriveAt, flightSec),
    })
  }

  const scene: ReenactmentSceneInput = {
    type: 'reenactment',
    narration: params.narration,
    actors,
    cameraPath: [
      { time: 0, position: [-0.3, 1.4, 3.2] },
      { time: DATA_ACCESS_LOOP_SEC / 2, position: [-0.3, 1.3, 2.8] },
      { time: DATA_ACCESS_LOOP_SEC, position: [-0.3, 1.4, 3.2] },
    ],
  }
  return ReenactmentSceneSchema.parse(scene)
}
