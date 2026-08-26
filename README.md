# news-video-generator

A framework-agnostic TypeScript + Three.js toolkit for building 3D news-broadcast
videos: a studio scene, a swappable low-poly announcer avatar with vendor-agnostic
viseme lipsync, and helpers for building 3D reenactment scenes.

The core library (`import ... from 'news-video-generator'`) deliberately has
**no dependency on any TTS/cloud service**. It consumes a plain viseme
timeline (`{ time, viseme }[]`) that you produce however you like (AWS Polly
speech marks, a local model, hand-authored timing, ...), so importing it
never pulls in a paid/proprietary dependency. TTS support is opt-in and
pluggable via `NarrationProvider` (see "CLI" below) — the bundled Polly
implementation lives at the separate `news-video-generator/polly` entry
point, not the main one, specifically so it stays out of the dependency
graph of anyone who doesn't use it.

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
(reenactment scene helpers and `patterns/` — reusable, parameterized cutaways
like `booksPattern`, `settlementPattern`, `scalePattern`, keyed by name in
`PATTERN_REGISTRY`).

## Building a whole video from a YAML script

Beyond the low-level scene-building API above, this package also ships a
`news-video-generator` CLI for turning a flat, human- (or LLM-) authored list
of narrated "beats" into a rendered video, without hand-placing any
coordinates:

```yaml
# script.yaml
title: "..."
beats:
  - text: "Narrated sentence for this beat."
    scene: studio        # the announcer avatar, or a name from PATTERN_REGISTRY
  - text: "..."
    scene: books
    params:
      bookCount: 5         # optional, pattern-specific — see schema/videoScript.ts
  - text: "..."
    scene: video          # full-screen cutaway to a pre-rendered clip — see below
    params:
      src: "my-clip.webm"
```

### Video beats (real footage, not a code-driven pattern)

`scene: video` is a third scene kind alongside `studio` and `PATTERN_REGISTRY`
patterns, for cutting away to an actual pre-rendered clip (e.g. a Blender
export) instead of a procedural keyframe animation. `params.src` is a path
resolved relative to `--out-dir` — put the file there (e.g. in `public/`)
next to where `narration.mp3` gets written, same as any other asset the
renderer needs to fetch.

The clip plays full-screen (a plane sized to exactly fill the studio
camera's frustum) for as long as the beat's narration lasts, looping if the
narration runs longer than the clip. It's driven by a real `<video>` element
playing in real time — `--record`'s Playwright capture is itself a real-time
screen recording, so this stays in sync the same way the studio avatar does,
with no per-frame seeking needed.

**Codec note:** the Chromium build Playwright installs is the open-source
build, which cannot decode H.264 (`video.canPlayType('video/mp4; codecs=avc1...')`
returns `''`) — an H.264 `.mp4` will silently render as a black rectangle
under `--record`. Transcode to VP9/WebM first:

```bash
ffmpeg -i my-clip.mp4 -c:v libvpx-vp9 -b:v 0 -crf 32 -an -pix_fmt yuv420p my-clip.webm
```

```bash
npm install news-video-generator
# Narration needs a TTS provider — the bundled one needs its own install:
npm install @aws-sdk/client-polly

npx news-video-generator generate script.yaml --out-dir public
```

This writes `narration.mp3` + `narration-visemes.json` + `narration-scenes.json`
(each beat already resolved into a concrete `ReenactmentScene`, or `studio`) to
`--out-dir`. Rendering those into a page is a separate concern — see
`news-video-generator-playground`'s `src/main.ts` for a minimal renderer that
fetches those two JSON files and builds/plays whichever scenes they contain.

Recording that page into an actual video file is optional (`--record`, needs
`npm install playwright` and a system `ffmpeg`, plus a page already serving
the scenes at `--dev-url`, default `http://localhost:5173`) — the CLI never
requires Playwright unless you pass that flag.

`VideoScriptSchema` / `validateVideoScript` / `resolveBeatScene` (in
`schema/videoScript.ts`) and the `NarrationProvider` interface (in
`narration/provider.ts`) are all exported from the main package too, if you'd
rather drive this yourself (e.g. a different TTS provider) instead of using
the CLI as-is.

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
no example app and no CI; it is meant to be consumed as a library. See the
sibling `news-video-generator-playground` repo for that renderer + a working
`generate` invocation.

## License

MIT — see `LICENSE`. Third-party license notes: see `CREDITS.md`.
