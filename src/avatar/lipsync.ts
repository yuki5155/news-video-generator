import type { Avatar } from './createAnnouncerAvatar'
import type { VisemeCue } from '../schema/script'

/**
 * Openness lookup for the common Polly/IPA-style viseme codes. Any TTS
 * provider's speech marks can be mapped to these same codes upstream, keeping
 * this library free of a hard dependency on any particular TTS vendor.
 */
const VISEME_OPENNESS: Record<string, number> = {
  sil: 0,
  p: 0.05,
  t: 0.15,
  S: 0.2,
  T: 0.15,
  f: 0.1,
  k: 0.3,
  i: 0.35,
  r: 0.3,
  s: 0.15,
  u: 0.25,
  '@': 0.4,
  a: 1,
  e: 0.6,
  E: 0.55,
  o: 0.7,
  O: 0.75,
}

export function visemeOpenness(viseme: string): number {
  return VISEME_OPENNESS[viseme] ?? 0.4
}

export interface LipsyncDriver {
  /** Call once per rendered frame with the current narration playback time, in seconds. */
  update(currentTimeSec: number): void
}

/**
 * Caller drives the clock (e.g. from a Playwright-recorded render loop, or an
 * audio element's currentTime) rather than this owning a timer, so playback
 * stays frame-accurate when rendering to video.
 */
export function driveLipsync(avatar: Avatar, timeline: VisemeCue[]): LipsyncDriver {
  const sorted = [...timeline].sort((a, b) => a.time - b.time)

  return {
    update(currentTimeSec: number) {
      let active: VisemeCue | undefined
      for (const cue of sorted) {
        if (cue.time > currentTimeSec) break
        active = cue
      }
      avatar.setMouthOpenness(active ? visemeOpenness(active.viseme) : 0)
    },
  }
}
