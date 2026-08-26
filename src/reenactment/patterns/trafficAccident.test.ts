import { describe, expect, it } from 'vitest'
import { trafficAccidentPattern } from './trafficAccident'
import { createReenactmentScene } from '../createReenactmentScene'

describe('trafficAccidentPattern', () => {
  it('produces a schema-valid scene with a vehicle and a pedestrian', () => {
    const scene = trafficAccidentPattern({
      narration: 'A car struck a pedestrian crossing the street.',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
    })

    expect(scene.type).toBe('reenactment')
    expect(scene.actors.map((a) => a.id)).toEqual(['vehicle', 'pedestrian'])
  })

  it('has both actors reach the collision point at the same time', () => {
    const scene = trafficAccidentPattern({
      narration: 'A car struck a pedestrian crossing the street.',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
      collisionPoint: [1, 5],
      collisionTimeSec: 3,
    })

    const vehicle = scene.actors.find((a) => a.id === 'vehicle')!
    const pedestrian = scene.actors.find((a) => a.id === 'pedestrian')!
    const vehicleAtCollision = vehicle.motion!.find((k) => k.time === 3)!
    const pedestrianAtCollision = pedestrian.motion!.find((k) => k.time === 3)!

    expect(vehicleAtCollision.position[0]).toBeCloseTo(1)
    expect(pedestrianAtCollision.position[2]).toBeCloseTo(5)
  })

  it('reverses the vehicle travel direction when vehicleDirection flips', () => {
    const leftToRight = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
    })
    const rightToLeft = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'right-to-left',
      pedestrianDirection: 'far-to-near',
    })

    const startX = (scene: typeof leftToRight) => scene.actors[0]!.motion![0]!.position[0]
    expect(startX(leftToRight)).toBeLessThan(0)
    expect(startX(rightToLeft)).toBeGreaterThan(0)
  })

  it('resolves into a stage that createReenactmentScene can build and animate', () => {
    const scene = trafficAccidentPattern({
      narration: 'A car struck a pedestrian crossing the street.',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
    })

    const stage = createReenactmentScene(scene)
    expect(stage.actors).toHaveLength(2)
    expect(() => stage.update(1.5)).not.toThrow()
  })

  it('uses the composite vehicle/person shapes, not generic primitives', () => {
    const scene = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
    })

    expect(scene.actors.find((a) => a.id === 'vehicle')!.shape).toBe('vehicle')
    expect(scene.actors.find((a) => a.id === 'pedestrian')!.shape).toBe('person')
  })

  it('skids the vehicle to a stop well short of its pre-impact pace after collision', () => {
    const scene = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
      collisionTimeSec: 2,
      leadTimeSec: 2,
      trailTimeSec: 1,
    })

    const vehicle = scene.actors.find((a) => a.id === 'vehicle')!
    const preImpactDist = vehicle.motion![1]!.position[0] - vehicle.motion![0]!.position[0]
    const postImpactDist = vehicle.motion![2]!.position[0] - vehicle.motion![1]!.position[0]
    // Pre-impact covers 2s at speed; post-impact covers 1s but braking, so it
    // should be well under half the pre-impact distance, not proportional.
    expect(postImpactDist).toBeLessThan(preImpactDist * 0.3)
  })

  it('throws the pedestrian in the vehicle direction of travel, airborne mid-arc', () => {
    const scene = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
    })

    const pedestrian = scene.actors.find((a) => a.id === 'pedestrian')!
    const [start, collision, airborne, landed] = pedestrian.motion!

    // Thrown in +X (vehicle's direction), not continuing along its own -Z crossing path.
    expect(landed!.position[0]).toBeGreaterThan(collision!.position[0])
    // Briefly rises above ground level mid-knockback before landing.
    expect(airborne!.position[1]).toBeGreaterThan(landed!.position[1])
    expect(start).toBeDefined()
  })

  it('tips the pedestrian from standing to lying flat instead of landing on their feet', () => {
    const leftToRight = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
    })
    const rightToLeft = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'right-to-left',
      pedestrianDirection: 'far-to-near',
    })

    const motionOf = (scene: typeof leftToRight) => scene.actors.find((a) => a.id === 'pedestrian')!.motion!

    for (const scene of [leftToRight, rightToLeft]) {
      const [start, collision, airborne, landed] = motionOf(scene)
      // Still upright when hit; airborne mid-tumble is a partial turn toward fully down.
      expect(start!.rotationZ).toBe(0)
      expect(collision!.rotationZ).toBe(0)
      expect(Math.abs(airborne!.rotationZ)).toBeGreaterThan(0)
      expect(Math.abs(airborne!.rotationZ)).toBeLessThan(Math.abs(landed!.rotationZ))
      // A quarter turn — lying flat, not just tilted.
      expect(Math.abs(landed!.rotationZ)).toBeCloseTo(Math.PI / 2)
    }

    // Falls toward the direction the vehicle was heading, so the fall direction flips with it.
    const leftToRightLanded = motionOf(leftToRight).at(-1)!
    const rightToLeftLanded = motionOf(rightToLeft).at(-1)!
    expect(Math.sign(leftToRightLanded.rotationZ)).not.toBe(Math.sign(rightToLeftLanded.rotationZ))
  })

  it('gives the camera a jolt right at the moment of impact', () => {
    const scene = trafficAccidentPattern({
      narration: '',
      vehicleDirection: 'left-to-right',
      pedestrianDirection: 'far-to-near',
      collisionTimeSec: 2,
    })

    // More than a start/end pair — includes the pre-impact dolly and the shake.
    expect(scene.cameraPath.length).toBeGreaterThan(2)
    const atImpact = scene.cameraPath.find((k) => k.time === 2)!
    // Jolts sideways off the dolly-in's x=0 center line at the moment of impact.
    expect(atImpact.position[0]).not.toBe(0)
  })
})
