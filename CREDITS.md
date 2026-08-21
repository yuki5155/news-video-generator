# Credits

This project is built entirely from code and open-source libraries — no third-party
media assets (models, textures, fonts, audio) are bundled.

## Libraries

| Library | License |
| --- | --- |
| [three.js](https://github.com/mrdoob/three.js) | MIT |
| [zod](https://github.com/colinhacks/zod) | MIT |

## Not included

Text-to-speech narration (e.g. AWS Polly) is intentionally **not** a dependency of
this library — it consumes a vendor-agnostic viseme timeline (see `src/avatar/lipsync.ts`),
so any TTS provider's speech marks can be adapted to it. If you add narration in a
downstream project, document that provider's license/terms in your own CREDITS.md.

Any future third-party assets added to this repo (models, BGM, etc.) must be listed
here with their license before being committed.
