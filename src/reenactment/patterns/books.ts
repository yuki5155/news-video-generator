import { z } from 'zod'
import type { PositionKeyframeInput, ReenactmentSceneInput } from '../../schema/script'
import { ReenactmentSceneSchema } from '../../schema/script'
import type { ReenactmentPatternResolver } from './types'

/**
 * An AI model (a sphere) consuming books that fly in from off-screen and
 * settle at its center, staggered and looped so a cutaway sized to a
 * narration beat reads as a continuous stream of training data rather than
 * a one-shot animation. Typical for "AI trained on copyrighted works" beats.
 */
export const BooksParamsSchema = z.object({
  narration: z.string(),
  /** How many books fly into the model per loop. Defaults to 4. */
  bookCount: z.number().int().min(1).max(6).default(4),
})
export type BooksParams = z.infer<typeof BooksParamsSchema>
/** Input shape (pre-defaults) — use this to type params you construct by hand. */
export type BooksParamsInput = z.input<typeof BooksParamsSchema>

/** Seconds per loop cycle — callers driving this pattern's Stage.update should pass `elapsed % BOOKS_LOOP_SEC`. */
export const BOOKS_LOOP_SEC = 4

const AI_CORE_POSITION: [number, number, number] = [0, 1.0, 0]
const BOOK_COLORS = ['#c9a86a', '#a8763f', '#d9c08a', '#8a5a2f', '#e0c088', '#7a4f28']
// Scattered starting points (behind/around the sphere); extra books past
// this list wrap around with a small deterministic offset so bookCount > 4
// still looks reasonable instead of stacking exactly on an earlier book.
const START_POSITIONS: [number, number, number][] = [
  [-2.4, 0.6, 0.3],
  [-2.2, 1.0, -0.2],
  [-2.5, 1.3, 0.1],
  [-2.1, 0.7, -0.4],
]

function buildBookMotion(
  startPos: [number, number, number],
  arriveAt: number,
  flightSec: number,
  spinDirection: 1 | -1,
): PositionKeyframeInput[] {
  const departAt = Math.max(0, arriveAt - flightSec)
  return [
    { time: departAt, position: startPos },
    { time: arriveAt, position: AI_CORE_POSITION, rotationZ: spinDirection * Math.PI * 1.2 },
  ]
}

export const booksPattern: ReenactmentPatternResolver<BooksParamsInput> = (paramsInput) => {
  const params = BooksParamsSchema.parse(paramsInput)
  const flightSec = 1.3
  // Spread arrivals evenly across the loop (minus a settle beat at the end)
  // regardless of how many books there are.
  const arrivalSpan = BOOKS_LOOP_SEC - 0.7

  const actors: ReenactmentSceneInput['actors'] = [
    { id: 'ai-core', shape: 'sphere', color: '#5b8dd9', position: AI_CORE_POSITION, scale: [2, 2, 2] },
  ]
  for (let i = 0; i < params.bookCount; i++) {
    const base = START_POSITIONS[i % START_POSITIONS.length]!
    const wrap = Math.floor(i / START_POSITIONS.length)
    const startPos: [number, number, number] = [base[0] - wrap * 0.15, base[1] + wrap * 0.2, base[2] + wrap * 0.15]
    const arriveAt = 1.0 + (arrivalSpan * i) / params.bookCount
    actors.push({
      id: `book-${i}`,
      shape: 'box',
      color: BOOK_COLORS[i % BOOK_COLORS.length]!,
      position: startPos,
      scale: [1, 0.16, 1.3],
      motion: buildBookMotion(startPos, arriveAt, flightSec, i % 2 === 0 ? 1 : -1),
    })
  }

  const scene: ReenactmentSceneInput = {
    type: 'reenactment',
    narration: params.narration,
    actors,
    cameraPath: [
      { time: 0, position: [0, 1.4, 3.0] },
      { time: BOOKS_LOOP_SEC / 2, position: [0, 1.3, 2.6] },
      { time: BOOKS_LOOP_SEC, position: [0, 1.4, 3.0] },
    ],
  }
  return ReenactmentSceneSchema.parse(scene)
}
