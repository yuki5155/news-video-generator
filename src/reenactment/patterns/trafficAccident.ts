import type { PositionKeyframe, ReenactmentScene } from '../../schema/script'
import { ReenactmentSceneSchema } from '../../schema/script'
import type { ReenactmentPatternResolver } from './types'

export type TrafficAccidentSpeed = 'slow' | 'normal' | 'fast'

export interface TrafficAccidentParams {
  narration: string
  /** Which way the vehicle travels along the ground-plane X axis. */
  vehicleDirection: 'left-to-right' | 'right-to-left'
  /** Which way the pedestrian travels along the ground-plane Z axis, crossing the vehicle's path. */
  pedestrianDirection: 'far-to-near' | 'near-to-far'
  /** Ground-plane [x, z] point where the two paths cross. Defaults to [0, 0]. */
  collisionPoint?: [number, number]
  /** Playback time, in seconds, at which both actors reach `collisionPoint`. Defaults to 2. */
  collisionTimeSec?: number
  /** Defaults to 'normal'. */
  speed?: TrafficAccidentSpeed
  /** How long before the collision the actors start moving, in seconds. Defaults to 2. */
  leadTimeSec?: number
  /** How long after the collision the vehicle skids to a stop and the pedestrian is thrown clear, in seconds. Defaults to 1. */
  trailTimeSec?: number
}

const SPEED_METERS_PER_SEC: Record<TrafficAccidentSpeed, number> = {
  slow: 1,
  normal: 2.5,
  fast: 5,
}

// The `vehicle`/`person` composite shapes are already grounded at y=0 (see
// createReenactmentScene's buildVehicleObject/buildPersonObject), so both
// actors' paths stay at ground level unless thrown airborne.
const VEHICLE_GROUND_Y = 0
const PEDESTRIAN_GROUND_Y = 0

// The vehicle brakes hard on impact, so its post-collision skid covers far less
// ground than a straight continuation at pre-impact speed would.
const VEHICLE_SKID_FACTOR = 0.35
// The pedestrian is thrown in the vehicle's direction of travel — not their own
// original crossing direction — and briefly airborne before landing.
const PEDESTRIAN_KNOCKBACK_FACTOR = 1.4
const PEDESTRIAN_AIRBORNE_LIFT = 0.3

// A short, deterministic camera jolt right at the moment of impact.
const CAMERA_SHAKE_SEC = 0.16

const VEHICLE_AXIS_SIGN: Record<TrafficAccidentParams['vehicleDirection'], 1 | -1> = {
  'left-to-right': 1,
  'right-to-left': -1,
}
const PEDESTRIAN_AXIS_SIGN: Record<TrafficAccidentParams['pedestrianDirection'], 1 | -1> = {
  'near-to-far': 1,
  'far-to-near': -1,
}

/**
 * Vehicle-vs-pedestrian traffic accident: the vehicle travels a straight line
 * along X, the pedestrian crosses it along Z, and both reach `collisionPoint`
 * at `collisionTimeSec`. On impact the vehicle brakes into a short skid and
 * the pedestrian is knocked (briefly airborne) in the vehicle's direction of
 * travel, while the camera dollies in and takes a quick jolt.
 */
export const trafficAccidentPattern: ReenactmentPatternResolver<TrafficAccidentParams> = (params) => {
  const {
    narration,
    vehicleDirection,
    pedestrianDirection,
    collisionPoint = [0, 0],
    collisionTimeSec = 2,
    speed = 'normal',
    leadTimeSec = 2,
    trailTimeSec = 1,
  } = params

  const [cx, cz] = collisionPoint
  const metersPerSec = SPEED_METERS_PER_SEC[speed]
  const vehicleSign = VEHICLE_AXIS_SIGN[vehicleDirection]
  const pedestrianSign = PEDESTRIAN_AXIS_SIGN[pedestrianDirection]

  const leadDist = metersPerSec * leadTimeSec
  const skidDist = metersPerSec * trailTimeSec * VEHICLE_SKID_FACTOR
  const knockbackDist = metersPerSec * trailTimeSec * PEDESTRIAN_KNOCKBACK_FACTOR
  const startTime = collisionTimeSec - leadTimeSec
  const endTime = collisionTimeSec + trailTimeSec
  const knockbackPeakTime = collisionTimeSec + trailTimeSec / 2

  const vehicleMotion: PositionKeyframe[] = [
    { time: startTime, position: [cx - vehicleSign * leadDist, VEHICLE_GROUND_Y, cz] },
    { time: collisionTimeSec, position: [cx, VEHICLE_GROUND_Y, cz] },
    { time: endTime, position: [cx + vehicleSign * skidDist, VEHICLE_GROUND_Y, cz] },
  ]

  const pedestrianMotion: PositionKeyframe[] = [
    { time: startTime, position: [cx, PEDESTRIAN_GROUND_Y, cz - pedestrianSign * leadDist] },
    { time: collisionTimeSec, position: [cx, PEDESTRIAN_GROUND_Y, cz] },
    {
      time: knockbackPeakTime,
      position: [cx + vehicleSign * knockbackDist * 0.6, PEDESTRIAN_GROUND_Y + PEDESTRIAN_AIRBORNE_LIFT, cz],
    },
    { time: endTime, position: [cx + vehicleSign * knockbackDist, PEDESTRIAN_GROUND_Y, cz] },
  ]

  const cameraPath: PositionKeyframe[] = [
    { time: startTime, position: [cx, 1.6, cz + 4] },
    { time: collisionTimeSec - 0.15, position: [cx, 1.45, cz + 3.2] },
    { time: collisionTimeSec, position: [cx + 0.06, 1.5, cz + 3.15] },
    { time: collisionTimeSec + CAMERA_SHAKE_SEC * 0.5, position: [cx - 0.05, 1.42, cz + 3.25] },
    { time: collisionTimeSec + CAMERA_SHAKE_SEC, position: [cx + 0.02, 1.47, cz + 3.2] },
    { time: endTime, position: [cx, 1.5, cz + 3.35] },
  ]

  const scene: ReenactmentScene = {
    type: 'reenactment',
    narration,
    actors: [
      {
        id: 'vehicle',
        shape: 'vehicle',
        color: '#8a3a3a',
        position: vehicleMotion[0]!.position,
        scale: [1, 1, 1],
        motion: vehicleMotion,
      },
      {
        id: 'pedestrian',
        shape: 'person',
        color: '#e8c547',
        position: pedestrianMotion[0]!.position,
        scale: [1, 1, 1],
        motion: pedestrianMotion,
      },
    ],
    cameraPath,
  }

  return ReenactmentSceneSchema.parse(scene)
}
