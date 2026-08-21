import { describe, expect, it } from 'vitest'
import { createStudioScene } from './createStudioScene'

describe('createStudioScene', () => {
  it('builds a scene containing the desk', () => {
    const { scene, desk } = createStudioScene()
    expect(scene.children).toContain(desk)
  })
})
