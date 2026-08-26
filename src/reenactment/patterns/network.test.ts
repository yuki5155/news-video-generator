import { describe, expect, it } from 'vitest'
import { networkPattern } from './network'

describe('networkPattern', () => {
  it('creates a node, spoke, and pulse per nodeCount, plus the core', () => {
    const scene = networkPattern({ narration: '', nodeCount: 4 })
    expect(scene.actors.filter((a) => a.id.startsWith('node-'))).toHaveLength(4)
    expect(scene.actors.filter((a) => a.id.startsWith('spoke-'))).toHaveLength(4)
    expect(scene.actors.filter((a) => a.id.startsWith('pulse-'))).toHaveLength(4)
    expect(scene.actors.find((a) => a.id === 'ai-core')).toBeDefined()
  })

  it('defaults to 5 nodes', () => {
    const scene = networkPattern({ narration: '' })
    expect(scene.actors.filter((a) => a.id.startsWith('node-'))).toHaveLength(5)
  })

  it('each pulse starts at the core and arrives at its node', () => {
    const scene = networkPattern({ narration: '', nodeCount: 3 })
    const core = scene.actors.find((a) => a.id === 'ai-core')!
    const pulse0 = scene.actors.find((a) => a.id === 'pulse-0')!
    const node0 = scene.actors.find((a) => a.id === 'node-0')!
    expect(pulse0.motion!.at(0)!.position).toEqual(core.position)
    expect(pulse0.motion!.at(-1)!.position).toEqual(node0.position)
  })
})
