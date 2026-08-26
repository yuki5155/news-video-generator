import { describe, expect, it } from 'vitest'
import { VideoScriptSchema, resolveBeatScene, validateVideoScript, VideoScriptValidationError } from './videoScript'

describe('videoScript', () => {
  it('parses a script mixing studio and pattern beats', () => {
    const script = VideoScriptSchema.parse({
      title: 'Test',
      beats: [
        { text: 'Intro.', scene: 'studio' },
        { text: 'Books fly in.', scene: 'books' },
        { text: 'Ruling.', scene: 'scale', params: { tiltDirection: 'right' } },
      ],
    })
    expect(() => validateVideoScript(script)).not.toThrow()
  })

  it('resolveBeatScene returns null for a studio beat', () => {
    const script = VideoScriptSchema.parse({ title: 'T', beats: [{ text: 'Hi.', scene: 'studio' }] })
    expect(resolveBeatScene(script.beats[0]!)).toBeNull()
  })

  it('resolveBeatScene resolves a pattern beat and uses the beat text as narration', () => {
    const script = VideoScriptSchema.parse({ title: 'T', beats: [{ text: 'Payout happened.', scene: 'settlement' }] })
    const resolved = resolveBeatScene(script.beats[0]!)
    expect(resolved).not.toBeNull()
    expect(resolved!.scene.narration).toBe('Payout happened.')
  })

  it('rejects an unknown scene name', () => {
    const script = VideoScriptSchema.parse({ title: 'T', beats: [{ text: 'Hi.', scene: 'nonexistent' }] })
    expect(() => validateVideoScript(script)).toThrow(VideoScriptValidationError)
  })

  it('rejects invalid params for a known pattern', () => {
    const script = VideoScriptSchema.parse({
      title: 'T',
      beats: [{ text: 'Hi.', scene: 'scale', params: { tiltDirection: 'up' } }],
    })
    expect(() => validateVideoScript(script)).toThrow(VideoScriptValidationError)
  })
})
