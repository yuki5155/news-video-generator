import { describe, expect, it } from 'vitest'
import { NewsScriptSchema } from './script'

describe('NewsScriptSchema', () => {
  it('parses a script with a studio scene and a reenactment scene', () => {
    const result = NewsScriptSchema.parse({
      id: 'news-2026-08-21-01',
      title: 'Example bulletin',
      scenes: [
        { type: 'studio', narration: 'Good evening.' },
        {
          type: 'reenactment',
          narration: 'Here is what happened.',
          actors: [{ id: 'car', shape: 'box', color: '#cc3333', position: [0, 0.25, 0] }],
          cameraPath: [[0, 1.5, 4]],
        },
      ],
    })

    expect(result.scenes).toHaveLength(2)
    expect(result.scenes[0]?.type).toBe('studio')
  })

  it('rejects a script with no scenes', () => {
    expect(() => NewsScriptSchema.parse({ id: 'x', title: 'x', scenes: [] })).toThrow()
  })
})
