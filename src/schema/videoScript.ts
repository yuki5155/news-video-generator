import { z } from 'zod'
import type { ReenactmentScene } from './script'
import { PATTERN_REGISTRY } from '../reenactment/patterns/registry'

/**
 * The unit a video script is authored in: one narrated sentence (or short
 * group of sentences) plus which scene illustrates it. Distinct from the
 * lower-level `Scene` in `./script` — a beat names a *pattern* (by the key
 * it's registered under in `PATTERN_REGISTRY`) rather than spelling out a
 * full actor list, so a human (or an LLM) can author a whole video as a flat
 * list of beats without hand-placing coordinates.
 */
export const BeatSchema = z.object({
  text: z.string().min(1),
  /** 'studio' (the announcer) or a name registered in PATTERN_REGISTRY. */
  scene: z.string().min(1),
  /** Extra pattern-specific params (e.g. `tiltDirection` for `scale`). The pattern's own narration comes from `text`, not from here. */
  params: z.record(z.unknown()).default({}),
})
export type Beat = z.infer<typeof BeatSchema>
export type BeatInput = z.input<typeof BeatSchema>

export const VideoScriptSchema = z.object({
  title: z.string().min(1),
  beats: z.array(BeatSchema).min(1),
})
export type VideoScript = z.infer<typeof VideoScriptSchema>
export type VideoScriptInput = z.input<typeof VideoScriptSchema>

export const STUDIO_SCENE = 'studio'
/** A full-screen real-footage cutaway (e.g. a pre-rendered mp4), as opposed to a code-driven PATTERN_REGISTRY animation. */
export const VIDEO_SCENE = 'video'

const VideoBeatParamsSchema = z.object({
  /** Path to the video file, relative to `--out-dir` (so it lives alongside narration.mp3, e.g. in `public/`). */
  src: z.string().min(1),
})

export class VideoScriptValidationError extends Error {}

/**
 * Resolves one beat's `scene` + `params` into a playable reenactment cutaway
 * — `null` for a 'studio' or 'video' beat, since those are rendered
 * directly rather than through a registered pattern. Beat text is always
 * used as that pattern's narration, so scripts don't repeat it in `params`.
 *
 * Throws `VideoScriptValidationError` for an unknown scene name or params
 * that fail the pattern's own schema (e.g. a typo'd enum value).
 */
export function resolveBeatScene(beat: Beat): { scene: ReenactmentScene; loopSec: number } | null {
  if (beat.scene === STUDIO_SCENE || beat.scene === VIDEO_SCENE) return null

  const pattern = PATTERN_REGISTRY[beat.scene]
  if (!pattern) {
    const known = [STUDIO_SCENE, VIDEO_SCENE, ...Object.keys(PATTERN_REGISTRY)].join(', ')
    throw new VideoScriptValidationError(`unknown scene "${beat.scene}" — expected one of: ${known}`)
  }

  const parsed = pattern.paramsSchema.safeParse({ narration: beat.text, ...beat.params })
  if (!parsed.success) {
    throw new VideoScriptValidationError(`scene "${beat.scene}": ${parsed.error.message}`)
  }
  return { scene: pattern.resolve(parsed.data), loopSec: pattern.loopSec }
}

/**
 * Resolves a 'video' beat's params into the asset path to play full-screen —
 * `null` for any other scene kind. Mirrors `resolveBeatScene`'s
 * null-for-not-this-kind convention for the other non-pattern scene.
 */
export function resolveBeatVideo(beat: Beat): { src: string } | null {
  if (beat.scene !== VIDEO_SCENE) return null
  const parsed = VideoBeatParamsSchema.safeParse(beat.params)
  if (!parsed.success) {
    throw new VideoScriptValidationError(`scene "video": ${parsed.error.message}`)
  }
  return parsed.data
}

/**
 * Resolves every beat up front, so a CLI can fail fast on a bad script
 * (unknown scene, bad params) before spending time/money on narration
 * synthesis. Returns nothing — call `resolveBeatScene`/`resolveBeatVideo`
 * per-beat for the actual scenes once you also have that beat's timing.
 */
export function validateVideoScript(script: VideoScript): void {
  script.beats.forEach((beat, i) => {
    try {
      resolveBeatScene(beat)
      resolveBeatVideo(beat)
    } catch (err) {
      if (err instanceof VideoScriptValidationError) {
        throw new VideoScriptValidationError(`beats[${i}]: ${err.message}`)
      }
      throw err
    }
  })
}
