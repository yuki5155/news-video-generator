import { describe, expect, it } from 'vitest'
import { dataAccessPattern } from './dataAccess'

describe('dataAccessPattern', () => {
  it('creates one data card per itemCount, plus the owner and AI core', () => {
    const scene = dataAccessPattern({ narration: '', itemCount: 3 })
    const cards = scene.actors.filter((a) => a.id.startsWith('data-card-'))
    expect(cards).toHaveLength(3)
    expect(scene.actors.find((a) => a.id === 'data-owner')).toBeDefined()
    expect(scene.actors.find((a) => a.id === 'ai-core')).toBeDefined()
  })

  it('defaults to 4 items', () => {
    const scene = dataAccessPattern({ narration: '' })
    const cards = scene.actors.filter((a) => a.id.startsWith('data-card-'))
    expect(cards).toHaveLength(4)
  })
})
