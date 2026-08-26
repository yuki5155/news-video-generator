import type { VisemeCue } from '../schema/script'

/** One unit of narration to synthesize — usually one video-script beat. */
export interface NarrationSegment {
  /** Caller-assigned id (e.g. a beat id), echoed back in `segmentTimings` to correlate results. */
  id: string
  text: string
}

export interface SegmentTiming {
  id: string
  /** Seconds into the synthesized audio where this segment starts. */
  start: number
  /** Seconds into the synthesized audio where this segment ends (exclusive). */
  end: number
}

export interface NarrationResult {
  /** Encoded audio bytes (e.g. mp3) for the full narration track. */
  audio: Uint8Array
  durationSec: number
  /** Ready to hand to `driveLipsync()`. */
  visemes: VisemeCue[]
  /** One entry per input segment, in input order. */
  segmentTimings: SegmentTiming[]
}

/**
 * Turns narration text into audio + a viseme timeline + per-segment timing,
 * from whatever TTS backend a caller wants to plug in. `driveLipsync()`
 * only ever consumes the resulting `VisemeCue[]`, so it doesn't care which
 * provider produced them — see `avatar/lipsync.ts`'s viseme code table for
 * what a provider's visemes need to map onto.
 */
export interface NarrationProvider {
  synthesize(segments: NarrationSegment[]): Promise<NarrationResult>
}
