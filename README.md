# news-video-generator

A framework-agnostic TypeScript + Three.js toolkit for building 3D news-broadcast
videos: a studio scene, a swappable low-poly announcer avatar with vendor-agnostic
viseme lipsync, and helpers for building 3D reenactment scenes.

This package deliberately has **no dependency on any TTS/cloud service**. It
consumes a plain viseme timeline (`{ time, viseme }[]`) that you produce however
you like (AWS Polly speech marks, a local model, hand-authored timing, ...), so
the library itself stays 100% open-source with no paid/proprietary dependency.

## Install

```bash
npm install news-video-generator three
```

## Usage

```ts
import * as THREE from 'three'
import { createStudioScene, createAnnouncerAvatar, driveLipsync } from 'news-video-generator'

const renderer = new THREE.WebGLRenderer({ canvas })
// Scene objects are already marked castShadow/receiveShadow — shadows only
// actually render once you opt in here:
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const { scene, camera } = createStudioScene()
const avatar = createAnnouncerAvatar()
scene.add(avatar.group)

const lipsync = driveLipsync(avatar, visemeTimeline)

// Once per rendered frame, with the current playback time in seconds:
lipsync.update(currentTimeSec)   // moves the mouth
avatar.update(currentTimeSec)    // blinking + idle head/breathing motion
```

See `src/` for the full API: `schema/script.ts` (the news script/scene schema),
`studio/` (studio scene builder), `avatar/` (avatar + lipsync), `reenactment/`
(reenactment scene helpers).

## Development

This repo is developed inside Docker (see `Dockerfile` / `docker-compose.yml`) —
no toolchain is installed on the host.

```bash
docker compose run --rm dev pnpm install
docker compose run --rm dev pnpm test
docker compose run --rm dev pnpm build
```

To manually verify the built package behaves correctly as an external dependency
(not just via the workspace), import it from a separate sibling project via a
`file:` dependency rather than running a demo inside this repo — this repo has
no example app and no CI; it is meant to be consumed as a library.

## License

MIT — see `LICENSE`. Third-party license notes: see `CREDITS.md`.
