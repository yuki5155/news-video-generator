import { describe, expect, it } from 'vitest'
import { settlementPattern } from './settlement'

describe('settlementPattern', () => {
  it('produces a payer and payee plus the default cash count', () => {
    const scene = settlementPattern({ narration: 'A settlement was paid.' })
    expect(scene.actors.map((a) => a.id)).toContain('payer')
    expect(scene.actors.map((a) => a.id)).toContain('payee')
    expect(scene.actors.filter((a) => a.id.startsWith('cash-'))).toHaveLength(3)
  })

  it('rejects a payerColor that is not a hex color', () => {
    expect(() => settlementPattern({ narration: '', payerColor: 'blue' })).toThrow()
  })
})
