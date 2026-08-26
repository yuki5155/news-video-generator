import * as THREE from 'three'
import { createStudioScene } from '../studio/createStudioScene'
import { createAnnouncerAvatar } from '../avatar/createAnnouncerAvatar'
import { driveLipsync } from '../avatar/lipsync'
import { createTelop, type Telop } from '../telop/createTelop'
import { createReenactmentScene, type ReenactmentStage } from '../reenactment/createReenactmentScene'
import type { ReenactmentScene, VisemeCue } from '../schema/script'

// Standalone browser entry served by `news-video-generator generate --record`
// (see runRecord/startRendererServer in cli.ts) — bundled by tsup into
// dist/browser-renderer/main.js, with three.js inlined so a consumer never
// has to run their own dev server for `--record` to work. It knows nothing
// about the CLI or Node; it only talks to the two JSON endpoints the CLI's
// built-in server exposes at the same origin.

const canvas = document.querySelector<HTMLCanvasElement>('#app')
if (!canvas) throw new Error('#app canvas not found')

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight))

// Matches the shape `news-video-generator generate` writes to
// narration-scenes.json — each beat already carries a fully-resolved
// ReenactmentScene (from the pattern registry), so this file doesn't need
// to know about "books"/"settlement"/"scale" or any other pattern by name;
// it just builds and renders whatever scene data it's handed.
interface RenderBeat {
  id: string
  text: string
  start: number
  end: number
  scene:
    | { type: 'studio' }
    | { type: 'reenactment'; reenactmentScene: ReenactmentScene; loopSec: number }
    | { type: 'video'; src: string }
}

/**
 * A full-screen cutaway to real pre-rendered footage (e.g. a Blender
 * export), as opposed to a `reenactment` stage's code-driven keyframes.
 * The camera's FOV/aspect match `createReenactmentScene`'s so the plane
 * (built to exactly fill its frustum at `PLANE_Z`) reads edge-to-edge.
 */
interface VideoStage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  video: HTMLVideoElement
}

const PLANE_Z = -4

function createVideoStage(src: string): VideoStage {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100)
  scene.add(camera)

  const video = document.createElement('video')
  video.src = src
  video.loop = true
  video.muted = true
  video.playsInline = true

  const texture = new THREE.VideoTexture(video)
  const planeHeight = 2 * Math.abs(PLANE_Z) * Math.tan((camera.fov * Math.PI) / 360)
  const planeWidth = planeHeight * camera.aspect
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(planeWidth, planeHeight),
    new THREE.MeshBasicMaterial({ map: texture }),
  )
  plane.position.z = PLANE_Z
  scene.add(plane)

  return { scene, camera, video }
}

// Fallback used if narration-scenes.json hasn't been written yet (or this
// page is opened directly outside of `--record`) — a single static studio
// beat so the page still shows something reasonable.
//
// Its id deliberately doesn't collide with the CLI's own "b0", "b1", ...
// scheme: animate() only refreshes the telop text when the active beat id
// changes, so if real beat 0 also happened to be "b0" the swap from
// fallback to real data would go unnoticed and the fallback text would
// keep showing for that beat's entire duration.
const FALLBACK_BEATS: RenderBeat[] = [
  {
    id: 'fallback-0',
    text: 'news-video-generator generate <script.yaml> --out-dir <dir> を実行してください。',
    start: 0,
    end: Infinity,
    scene: { type: 'studio' },
  },
]

declare global {
  interface Window {
    // Set by the CLI's built-in renderer server (see startRendererServer in
    // cli.ts), which already has this beat/viseme data on disk at
    // page-load time and embeds it directly rather than making the page
    // fetch it — see the comment in main() below for why.
    __NEWS_VIDEO_GENERATOR_DATA__?: { visemes: VisemeCue[]; scenes: RenderBeat[] }
  }
}

async function main() {
  const studio = createStudioScene()
  const avatar = createAnnouncerAvatar()
  studio.scene.add(avatar.group)

  const studioTelop = createTelop()
  studio.camera.add(studioTelop.object)

  let visemeCues: VisemeCue[] = []
  let beats: RenderBeat[] = FALLBACK_BEATS
  let lipsync = driveLipsync(avatar, visemeCues)
  const reenactmentByBeatId = new Map<string, { stage: ReenactmentStage; loopSec: number; telop: Telop }>()
  const videoByBeatId = new Map<string, { stage: VideoStage; telop: Telop }>()
  const clock = new THREE.Clock()

  let activeBeatId = ''

  function animate() {
    requestAnimationFrame(animate)
    const elapsed = clock.getElapsedTime()

    const beat = beats.find((b) => elapsed >= b.start && elapsed < b.end) ?? beats[beats.length - 1]!
    if (beat.id !== activeBeatId) {
      const previousBeatId = activeBeatId
      activeBeatId = beat.id
      // Leaving a video beat: pause it so it doesn't keep decoding frames
      // (and, if the timeline ever revisits a beat id, restart from t=0).
      const previousVideo = videoByBeatId.get(previousBeatId)
      if (previousVideo) {
        previousVideo.stage.video.pause()
        previousVideo.stage.video.currentTime = 0
      }

      // Stage + Telop per reenactment/video beat, built lazily the first
      // time its beat becomes active rather than all up front — so an
      // embedded/fetched beat list doesn't add setup work before the very
      // first frame (which is almost always the studio beat).
      if (beat.scene.type === 'reenactment' && !reenactmentByBeatId.has(beat.id)) {
        const stage = createReenactmentScene(beat.scene.reenactmentScene)
        const telop = createTelop()
        stage.camera.add(telop.object)
        reenactmentByBeatId.set(beat.id, { stage, loopSec: beat.scene.loopSec, telop })
      }
      if (beat.scene.type === 'video' && !videoByBeatId.has(beat.id)) {
        const stage = createVideoStage(beat.scene.src)
        const telop = createTelop()
        stage.camera.add(telop.object)
        videoByBeatId.set(beat.id, { stage, telop })
      }
      if (beat.scene.type === 'video') videoByBeatId.get(beat.id)!.stage.video.play()

      const telop =
        beat.scene.type === 'studio'
          ? studioTelop
          : beat.scene.type === 'video'
            ? videoByBeatId.get(beat.id)!.telop
            : reenactmentByBeatId.get(beat.id)!.telop
      telop.setText(beat.text)
    }

    avatar.update(elapsed)
    lipsync.update(elapsed)

    const reenactmentEntry = beat.scene.type === 'reenactment' ? reenactmentByBeatId.get(beat.id) : undefined
    const videoEntry = beat.scene.type === 'video' ? videoByBeatId.get(beat.id) : undefined
    if (reenactmentEntry) {
      const localTime = (elapsed - beat.start) % reenactmentEntry.loopSec
      reenactmentEntry.stage.update(localTime)
      renderer.render(reenactmentEntry.stage.scene, reenactmentEntry.stage.camera)
    } else if (videoEntry) {
      renderer.render(videoEntry.stage.scene, videoEntry.stage.camera)
    } else {
      renderer.render(studio.scene, studio.camera)
    }
  }
  // Start rendering immediately, on the same clock that will drive the
  // whole beat timeline — Playwright's recording starts capturing as soon
  // as the page navigates, before any narration data is available, so
  // waiting on it before the first renderer.render() left the recorded
  // video opening on a black canvas, and skewed elapsed-time-based beat
  // playback away from the narration audio's own t=0.
  animate()

  // The CLI's built-in renderer server already has this data on disk at
  // page-load time (see startRendererServer in cli.ts) and embeds it
  // directly into the page instead of making it fetch — a page fetch would
  // otherwise leave the fallback beat above visible for the round trip,
  // which for `--record` is never necessary since the real data always
  // exists by then.
  const embedded = window.__NEWS_VIDEO_GENERATOR_DATA__
  if (embedded) {
    visemeCues = embedded.visemes
    beats = embedded.scenes
    lipsync = driveLipsync(avatar, visemeCues)
    return
  }

  try {
    const [visemesRes, scenesRes] = await Promise.all([
      fetch('/narration-visemes.json'),
      fetch('/narration-scenes.json'),
    ])
    if (visemesRes.ok) visemeCues = await visemesRes.json()
    if (scenesRes.ok) beats = await scenesRes.json()
    lipsync = driveLipsync(avatar, visemeCues)
  } catch {
    // No narration yet — fall back to a silent, static intro.
  }
}

main()
