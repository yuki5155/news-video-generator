import type { PositionKeyframe, Vec3 } from '../schema/script'

/**
 * Linearly interpolates position across time-ordered keyframes. Clamps to the
 * first keyframe before its time and the last keyframe after its time, so
 * callers don't need to know a timeline's start/end to drive it safely.
 */
export function interpolatePosition(keyframes: PositionKeyframe[], timeSec: number): Vec3 {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  const first = sorted[0]
  if (!first) throw new Error('interpolatePosition requires at least one keyframe')
  if (timeSec <= first.time) return first.position

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i]!
    const to = sorted[i + 1]!
    if (timeSec > to.time) continue

    const span = to.time - from.time
    const t = span === 0 ? 1 : (timeSec - from.time) / span
    return [
      from.position[0] + (to.position[0] - from.position[0]) * t,
      from.position[1] + (to.position[1] - from.position[1]) * t,
      from.position[2] + (to.position[2] - from.position[2]) * t,
    ]
  }

  return sorted[sorted.length - 1]!.position
}
