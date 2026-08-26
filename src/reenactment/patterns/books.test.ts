import { describe, expect, it } from 'vitest'
import { booksPattern } from './books'
import { createReenactmentScene } from '../createReenactmentScene'

describe('booksPattern', () => {
  it('produces a schema-valid scene with an AI core and the default book count', () => {
    const scene = booksPattern({ narration: 'Books fly into the model.' })
    expect(scene.type).toBe('reenactment')
    expect(scene.actors.filter((a) => a.id.startsWith('book-'))).toHaveLength(4)
  })

  it('respects a custom bookCount', () => {
    const scene = booksPattern({ narration: '', bookCount: 2 })
    expect(scene.actors.filter((a) => a.id.startsWith('book-'))).toHaveLength(2)
  })

  it('resolves into a stage that createReenactmentScene can build', () => {
    const scene = booksPattern({ narration: '' })
    const stage = createReenactmentScene(scene)
    expect(stage.actors.length).toBeGreaterThan(0)
  })
})
