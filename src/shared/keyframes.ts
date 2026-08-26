import type { PositionKeyframeInput, Vec3 } from '../schema/script'

/**
 * Locates the pair of time-ordered keyframes surrounding `timeSec` and the
 * interpolation fraction `t` between them, clamping to the first keyframe
 * before its time and the last keyframe after its time. Shared by every
 * per-field interpolator below so they all clamp/sort consistently.
 *
 * Takes the pre-defaults `PositionKeyframeInput` shape (not the schema
 * output) so callers can hand-build keyframes — e.g. in a pattern resolver,
 * before `.parse()` fills in defaults — without spelling out every field.
 */
function surroundingKeyframes(
  keyframes: PositionKeyframeInput[],
  timeSec: number,
): { from: PositionKeyframeInput; to: PositionKeyframeInput; t: number } {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  const first = sorted[0]
  if (!first) throw new Error('requires at least one keyframe')
  if (timeSec <= first.time) return { from: first, to: first, t: 0 }

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i]!
    const to = sorted[i + 1]!
    if (timeSec > to.time) continue

    const span = to.time - from.time
    const t = span === 0 ? 1 : (timeSec - from.time) / span
    return { from, to, t }
  }

  const last = sorted[sorted.length - 1]!
  return { from: last, to: last, t: 0 }
}

/**
 * Linearly interpolates position across time-ordered keyframes. Clamps to the
 * first keyframe before its time and the last keyframe after its time, so
 * callers don't need to know a timeline's start/end to drive it safely.
 */
export function interpolatePosition(keyframes: PositionKeyframeInput[], timeSec: number): Vec3 {
  const { from, to, t } = surroundingKeyframes(keyframes, timeSec)
  return [
    from.position[0] + (to.position[0] - from.position[0]) * t,
    from.position[1] + (to.position[1] - from.position[1]) * t,
    from.position[2] + (to.position[2] - from.position[2]) * t,
  ]
}

/** Linearly interpolates `rotationZ` (radians) across time-ordered keyframes, e.g. tipping an actor over as it falls. Missing `rotationZ` is treated as 0 (upright). */
export function interpolateRotationZ(keyframes: PositionKeyframeInput[], timeSec: number): number {
  const { from, to, t } = surroundingKeyframes(keyframes, timeSec)
  const fromRotation = from.rotationZ ?? 0
  const toRotation = to.rotationZ ?? 0
  return fromRotation + (toRotation - fromRotation) * t
}
