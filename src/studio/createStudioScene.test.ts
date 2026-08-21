import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createStudioScene } from './createStudioScene'

describe('createStudioScene', () => {
  it('builds a scene containing the desk and monitor', () => {
    const { scene, desk, monitor } = createStudioScene()
    expect(scene.children).toContain(desk)
    expect(scene.children).toContain(monitor.object)
  })

  it('configures the key light to cast shadows and the desk to both cast and receive them', () => {
    const { scene, desk } = createStudioScene()
    const key = scene.children.find(
      (o): o is THREE.DirectionalLight => o instanceof THREE.DirectionalLight && o.castShadow,
    )

    expect(key).toBeDefined()
    expect(desk.castShadow).toBe(true)
    expect(desk.receiveShadow).toBe(true)
  })
})
