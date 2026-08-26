import type { z } from 'zod'
import type { ReenactmentScene } from '../../schema/script'
import { BooksParamsSchema, booksPattern, BOOKS_LOOP_SEC } from './books'
import { SettlementParamsSchema, settlementPattern, SETTLEMENT_LOOP_SEC } from './settlement'
import { ScaleParamsSchema, scalePattern, SCALE_LOOP_SEC } from './scale'
import { DataAccessParamsSchema, dataAccessPattern, DATA_ACCESS_LOOP_SEC } from './dataAccess'
import { ShieldParamsSchema, shieldPattern, SHIELD_LOOP_SEC } from './shield'
import { NetworkParamsSchema, networkPattern, NETWORK_LOOP_SEC } from './network'

/**
 * A registry entry bundles everything a caller needs to turn untyped,
 * externally-supplied params (e.g. parsed from YAML) into a playable
 * reenactment cutaway: validate+default the params, resolve them into a
 * scene, and know how many seconds the animation takes before it should
 * repeat (`Stage.update(elapsed % loopSec)`).
 */
export interface RegisteredPattern {
  paramsSchema: z.ZodType<unknown, z.ZodTypeDef, unknown>
  loopSec: number
  resolve: (params: unknown) => ReenactmentScene
}

/**
 * Looping reenactment patterns, keyed by the name a video script (YAML)
 * beat uses in its `scene` field. Distinct from `NewsScriptSchema`'s
 * `studio`/`reenactment` scene *types* — this registry is one level higher,
 * mapping a short pattern name to a parameterized reenactment builder, for
 * consumers (like a CLI) that assemble a video from named beats rather than
 * hand-authoring full ReenactmentScene actor lists.
 */
// Each pattern's `resolve` is typed to its own Params — narrower than the
// `unknown` this registry works with — so callers get real type checking
// when they use a pattern directly (e.g. `booksPattern({...})`). The casts
// here are the one place that type is deliberately erased for the registry;
// safe because every resolver re-validates via its own paramsSchema.parse()
// before touching its params.
export const PATTERN_REGISTRY: Record<string, RegisteredPattern> = {
  books: { paramsSchema: BooksParamsSchema, loopSec: BOOKS_LOOP_SEC, resolve: booksPattern as RegisteredPattern['resolve'] },
  settlement: {
    paramsSchema: SettlementParamsSchema,
    loopSec: SETTLEMENT_LOOP_SEC,
    resolve: settlementPattern as RegisteredPattern['resolve'],
  },
  scale: { paramsSchema: ScaleParamsSchema, loopSec: SCALE_LOOP_SEC, resolve: scalePattern as RegisteredPattern['resolve'] },
  dataAccess: {
    paramsSchema: DataAccessParamsSchema,
    loopSec: DATA_ACCESS_LOOP_SEC,
    resolve: dataAccessPattern as RegisteredPattern['resolve'],
  },
  shield: {
    paramsSchema: ShieldParamsSchema,
    loopSec: SHIELD_LOOP_SEC,
    resolve: shieldPattern as RegisteredPattern['resolve'],
  },
  network: {
    paramsSchema: NetworkParamsSchema,
    loopSec: NETWORK_LOOP_SEC,
    resolve: networkPattern as RegisteredPattern['resolve'],
  },
}

export type PatternName = keyof typeof PATTERN_REGISTRY
