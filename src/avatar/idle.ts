const BLINK_PERIOD_SEC = 3.6
const BLINK_DURATION_SEC = 0.14

/**
 * 1 = eyes fully open, 0 = fully closed. A deterministic function of time
 * (not Math.random) so replaying the same narration timeline always renders
 * identical frames.
 */
export function blinkEyeOpenness(timeSec: number): number {
  const t = timeSec % BLINK_PERIOD_SEC
  if (t >= BLINK_DURATION_SEC) return 1

  const half = BLINK_DURATION_SEC / 2
  const phase = t < half ? t / half : (BLINK_DURATION_SEC - t) / half
  return 1 - phase
}

/** Subtle side-to-side head turn (radians) so the announcer isn't dead still. */
export function idleHeadYaw(timeSec: number): number {
  return Math.sin(timeSec * 0.45) * 0.05
}

/** Subtle vertical bob standing in for breathing. */
export function idleBreathBob(timeSec: number): number {
  return Math.sin(timeSec * 1.8) * 0.006
}
