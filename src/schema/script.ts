import { z } from 'zod'

export const VisemeCueSchema = z.object({
  time: z.number().nonnegative(),
  viseme: z.string(),
})
export type VisemeCue = z.infer<typeof VisemeCueSchema>

export const StudioSceneSchema = z.object({
  type: z.literal('studio'),
  narration: z.string(),
  cameraShot: z.enum(['wide', 'closeup', 'over-shoulder']).default('wide'),
  visemeTrackPath: z.string().optional(),
})
export type StudioScene = z.infer<typeof StudioSceneSchema>

export const ReenactmentActorSchema = z.object({
  id: z.string(),
  shape: z.enum(['box', 'sphere', 'capsule']).default('capsule'),
  color: z.string().default('#888888'),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
})
export type ReenactmentActor = z.infer<typeof ReenactmentActorSchema>

export const ReenactmentSceneSchema = z.object({
  type: z.literal('reenactment'),
  narration: z.string(),
  actors: z.array(ReenactmentActorSchema).default([]),
  cameraPath: z.array(z.tuple([z.number(), z.number(), z.number()])).min(1),
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
