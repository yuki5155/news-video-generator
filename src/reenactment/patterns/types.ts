import type { ReenactmentScene } from '../../schema/script'

/**
 * A reenactment pattern turns a handful of high-level parameters (roles,
 * direction, timing) into a full `ReenactmentScene` — actors, their motion
 * paths, and a camera path — so scripts don't hand-place raw coordinates for
 * scenarios that recur across bulletins (traffic accidents, break-ins, ...).
 */
export type ReenactmentPatternResolver<Params> = (params: Params) => ReenactmentScene
