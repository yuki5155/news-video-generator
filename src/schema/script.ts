import { z } from 'zod'

export const VisemeCueSchema = z.object({
  time: z.number().nonnegative(),
  viseme: z.string(),
})
export type VisemeCue = z.infer<typeof VisemeCueSchema>

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()])
export type Vec3 = z.infer<typeof Vec3Schema>

/** A single point on a timed motion path (actor movement or camera dolly). */
export const PositionKeyframeSchema = z.object({
  time: z.number().nonnegative(),
  position: Vec3Schema,
})
export type PositionKeyframe = z.infer<typeof PositionKeyframeSchema>

export const StudioSceneSchema = z.object({
  type: z.literal('studio'),
  narration: z.string(),
  cameraShot: z.enum(['wide', 'closeup', 'over-shoulder']).default('wide'),
  visemeTrackPath: z.string().optional(),
})
export type StudioScene = z.infer<typeof StudioSceneSchema>

export const ReenactmentActorSchema = z.object({
  id: z.string(),
  /**
   * `vehicle` and `person` are small composite silhouettes (body+cabin+wheels,
   * head+torso+legs) built at ground level, so a scene reads as "a car" or "a
   * person" without depicting a real individual. `box`/`sphere`/`capsule` stay
   * available as plain single-primitive markers for anything else.
   */
  shape: z.enum(['box', 'sphere', 'capsule', 'vehicle', 'person']).default('capsule'),
  color: z.string().default('#888888'),
  /** Static position, used as-is when `motion` is absent. */
  position: Vec3Schema.default([0, 0, 0]),
  /** Per-axis scale multiplier on the base shape geometry, e.g. stretching a box into a car-like silhouette. */
  scale: Vec3Schema.default([1, 1, 1]),
  /**
   * Optional timed movement path. When present, this drives the actor's
   * position at render time (via `ReenactmentStage.update`) and `position`
   * above is only the pre-motion pose actors are built at.
   */
  motion: z.array(PositionKeyframeSchema).min(1).optional(),
})
export type ReenactmentActor = z.infer<typeof ReenactmentActorSchema>

export const ReenactmentSceneSchema = z.object({
  type: z.literal('reenactment'),
  narration: z.string(),
  actors: z.array(ReenactmentActorSchema).default([]),
  cameraPath: z.array(PositionKeyframeSchema).min(1),
})
export type ReenactmentScene = z.infer<typeof ReenactmentSceneSchema>

export const SceneSchema = z.discriminatedUnion('type', [StudioSceneSchema, ReenactmentSceneSchema])
export type Scene = z.infer<typeof SceneSchema>

export const NewsScriptSchema = z.object({
  id: z.string(),
  title: z.string(),
  scenes: z.array(SceneSchema).min(1),
})
export type NewsScript = z.infer<typeof NewsScriptSchema>
