import { z } from 'zod'
import type { PositionKeyframeInput, ReenactmentSceneInput } from '../../schema/script'
import { ReenactmentSceneSchema } from '../../schema/script'
import type { ReenactmentPatternResolver } from './types'

/**
 * A central AI core wired to several small nodes arranged in a circle
 * (mail, calendar, messages, ...) via static spokes, with a bright pulse
 * repeatedly traveling out along each spoke — for "the assistant connects
 * to/reads from N of your accounts" beats. Spokes need a fixed rotation
 * with no motion, which `ReenactmentActor` can only express via a
 * single-valued `motion` array (there's no static `rotationZ` field), so
 * each spoke gets a two-keyframe motion that holds its angle constant.
 */
export const NetworkParamsSchema = z.object({
  narration: z.string(),
  /** How many connected nodes surround the core. Defaults to 5. */
  nodeCount: z.number().int().min(2).max(6).default(5),
})
export type NetworkParams = z.infer<typeof NetworkParamsSchema>
export type NetworkParamsInput = z.input<typeof NetworkParamsSchema>

export const NETWORK_LOOP_SEC = 4

const CORE_POSITION: [number, number, number] = [0, 1.1, 0]
const RADIUS = 1.35
const NODE_COLORS = ['#4fa3c9', '#e8a33d', '#5fbf6f', '#d9534f', '#4fd9c4', '#c98fd0']

function nodePosition(index: number, count: number): [number, number, number] {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2
  return [CORE_POSITION[0] + RADIUS * Math.cos(angle), CORE_POSITION[1] + RADIUS * Math.sin(angle) * 0.65, 0]
}

function spokeMotion(core: [number, number, number], node: [number, number, number]): PositionKeyframeInput[] {
  const mid: [number, number, number] = [(core[0] + node[0]) / 2, (core[1] + node[1]) / 2, (core[2] + node[2]) / 2]
  const angle = Math.atan2(node[1] - core[1], node[0] - core[0])
  return [
    { time: 0, position: mid, rotationZ: angle },
    { time: NETWORK_LOOP_SEC, position: mid, rotationZ: angle },
  ]
}

function pulseMotion(
  core: [number, number, number],
  node: [number, number, number],
  arriveAt: number,
  flightSec: number,
): PositionKeyframeInput[] {
  const departAt = Math.max(0, arriveAt - flightSec)
  return [
    { time: departAt, position: core },
    { time: arriveAt, position: node },
  ]
}

export const networkPattern: ReenactmentPatternResolver<NetworkParamsInput> = (paramsInput) => {
  const params = NetworkParamsSchema.parse(paramsInput)
  const flightSec = 1.2
  const arrivalSpan = NETWORK_LOOP_SEC - 0.6

  const actors: ReenactmentSceneInput['actors'] = [
    { id: 'ai-core', shape: 'sphere', color: '#8a5fd0', position: CORE_POSITION, scale: [1.5, 1.5, 1.5] },
  ]
  for (let i = 0; i < params.nodeCount; i++) {
    const node = nodePosition(i, params.nodeCount)
    const color = NODE_COLORS[i % NODE_COLORS.length]!
    const dist = Math.hypot(node[0] - CORE_POSITION[0], node[1] - CORE_POSITION[1])
    actors.push({ id: `node-${i}`, shape: 'sphere', color, position: node, scale: [0.28, 0.28, 0.28] })
    actors.push({
      id: `spoke-${i}`,
      shape: 'box',
      color: '#5a6a80',
      position: [(CORE_POSITION[0] + node[0]) / 2, (CORE_POSITION[1] + node[1]) / 2, 0],
      scale: [dist, 0.03, 0.03],
      motion: spokeMotion(CORE_POSITION, node),
    })
    const arriveAt = 0.6 + (arrivalSpan * i) / params.nodeCount
    actors.push({
      id: `pulse-${i}`,
      shape: 'sphere',
      color: '#eaf2ff',
      position: CORE_POSITION,
      scale: [0.13, 0.13, 0.13],
      motion: pulseMotion(CORE_POSITION, node, arriveAt, flightSec),
    })
  }

  const scene: ReenactmentSceneInput = {
    type: 'reenactment',
    narration: params.narration,
    actors,
    cameraPath: [
      { time: 0, position: [0, 1.4, 3.6] },
      { time: NETWORK_LOOP_SEC, position: [0, 1.4, 3.6] },
    ],
  }
  return ReenactmentSceneSchema.parse(scene)
}
