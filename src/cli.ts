#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as parseYaml } from 'js-yaml'
import type { ReenactmentScene } from './schema/script'
import {
  VideoScriptSchema,
  validateVideoScript,
  resolveBeatScene,
  resolveBeatVideo,
  type VideoScript,
} from './schema/videoScript'
import { createPollyNarrationProvider } from './narration/pollyProvider'
import type { NarrationSegment } from './narration/provider'

// The package's "bin" entry (package.json) points only at the ESM build
// (dist/cli.js), never dist/cli.cjs, so import.meta.url is safe to rely on
// here — esbuild's CJS bundle still emits a (harmless, unused) warning about
// it since it bundles both formats from this same source file.
const cliDir = path.dirname(fileURLToPath(import.meta.url))

interface GenerateArgs {
  scriptPath: string
  outDir: string
  region?: string
  voiceId?: string
  languageCode?: string
  record: boolean
  /** Page to record instead of the built-in renderer. Empty means self-host. */
  devUrl: string
  recordOut: string
  width: number
  height: number
}

type RenderBeat =
  | { id: string; text: string; start: number; end: number; scene: { type: 'studio' } }
  | {
      id: string
      text: string
      start: number
      end: number
      scene: { type: 'reenactment'; reenactmentScene: ReenactmentScene; loopSec: number }
    }
  | { id: string; text: string; start: number; end: number; scene: { type: 'video'; src: string } }

function printUsage(): void {
  console.log(`news-video-generator <command>

Commands:
  generate <script.yaml>   Synthesize narration + resolve scenes from a video script

Options for generate:
  --out-dir <dir>          Where to write narration.mp3 / narration-visemes.json / narration-scenes.json (default: ./out)
  --region <aws-region>    AWS region for Polly (default: from AWS config/env)
  --voice-id <id>          Polly voice id (default: Takumi)
  --language-code <code>   Polly language code (default: ja-JP)
  --record                 Also record a video via Playwright (spins up the built-in renderer itself)
  --dev-url <url>          Record this page instead of the built-in renderer (advanced; e.g. a custom app)
  --record-out <file>      Output video path (default: <out-dir>/video.mp4)
  --width <px>             Recording width (default: 960)
  --height <px>            Recording height (default: 540)
`)
}

function parseArgs(argv: string[]): GenerateArgs {
  const scriptPath = argv[0]
  if (!scriptPath || scriptPath.startsWith('--')) {
    throw new Error('generate requires a path to a video script YAML file')
  }
  const args: GenerateArgs = {
    scriptPath,
    outDir: './out',
    record: false,
    devUrl: '',
    recordOut: '',
    width: 960,
    height: 540,
  }
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i]
    const next = () => {
      i++
      const value = argv[i]
      if (value === undefined) throw new Error(`${flag} needs a value`)
      return value
    }
    switch (flag) {
      case '--out-dir':
        args.outDir = next()
        break
      case '--region':
        args.region = next()
        break
      case '--voice-id':
        args.voiceId = next()
        break
      case '--language-code':
        args.languageCode = next()
        break
      case '--record':
        args.record = true
        break
      case '--dev-url':
        args.devUrl = next()
        break
      case '--record-out':
        args.recordOut = next()
        break
      case '--width':
        args.width = Number(next())
        break
      case '--height':
        args.height = Number(next())
        break
      default:
        throw new Error(`unknown option: ${flag}`)
    }
  }
  if (!args.recordOut) args.recordOut = path.join(args.outDir, 'video.mp4')
  return args
}

function loadVideoScript(scriptPath: string): VideoScript {
  if (!existsSync(scriptPath)) throw new Error(`script not found: ${scriptPath}`)
  const raw = parseYaml(readFileSync(scriptPath, 'utf-8'))
  const script = VideoScriptSchema.parse(raw)
  validateVideoScript(script)
  return script
}

async function runGenerate(args: GenerateArgs): Promise<void> {
  const script = loadVideoScript(args.scriptPath)
  mkdirSync(args.outDir, { recursive: true })

  const segments: NarrationSegment[] = script.beats.map((beat, i) => ({ id: `b${i}`, text: beat.text }))

  const provider = createPollyNarrationProvider({
    region: args.region,
    voiceId: args.voiceId,
    languageCode: args.languageCode,
  })
  console.log(`Synthesizing narration for ${segments.length} beat(s)...`)
  const result = await provider.synthesize(segments)

  const renderBeats: RenderBeat[] = script.beats.map((beat, i) => {
    const timing = result.segmentTimings[i]!
    const base = { id: timing.id, text: beat.text, start: timing.start, end: timing.end }

    const video = resolveBeatVideo(beat)
    if (video) {
      if (!existsSync(path.join(args.outDir, video.src))) {
        throw new Error(`beats[${i}]: video "video" src not found: ${path.join(args.outDir, video.src)}`)
      }
      return { ...base, scene: { type: 'video', src: video.src } }
    }

    const resolved = resolveBeatScene(beat)
    return resolved
      ? { ...base, scene: { type: 'reenactment', reenactmentScene: resolved.scene, loopSec: resolved.loopSec } }
      : { ...base, scene: { type: 'studio' } }
  })

  writeFileSync(path.join(args.outDir, 'narration.mp3'), result.audio)
  writeFileSync(path.join(args.outDir, 'narration-duration.txt'), result.durationSec.toFixed(2))
  writeFileSync(path.join(args.outDir, 'narration-visemes.json'), JSON.stringify(result.visemes))
  writeFileSync(path.join(args.outDir, 'narration-scenes.json'), JSON.stringify(renderBeats))
  console.log(
    `Wrote narration.mp3 + ${result.visemes.length} viseme cues + ${renderBeats.length} beats to ${args.outDir} (~${result.durationSec.toFixed(1)}s)`,
  )

  if (args.record) {
    await runRecord(args, result.durationSec)
  } else {
    console.log('Skipping recording (pass --record to also produce a video via Playwright).')
  }
}

// Escapes a lone `</script` so embedded JSON can never terminate this tag
// early — narration text is free-form and could in principle contain it.
function escapeForInlineScript(json: string): string {
  return json.replace(/<\/script/gi, '<\\/script')
}

function rendererPageHtml(visemesJson: string, scenesJson: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>news-video-generator renderer</title>
    <style>
      html, body { margin: 0; height: 100%; background: #000; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <canvas id="app"></canvas>
    <script>
      window.__NEWS_VIDEO_GENERATOR_DATA__ = {
        visemes: ${escapeForInlineScript(visemesJson)},
        scenes: ${escapeForInlineScript(scenesJson)}
      };
    </script>
    <script src="/main.js"></script>
  </body>
</html>
`
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

/**
 * Serves the bundled browser renderer (dist/browser-renderer/main.js, built
 * from src/browser-renderer/main.ts) on an ephemeral localhost port, with
 * the beat/viseme JSON `generate` just wrote to `outDir` embedded directly
 * into the page — so `--record` never needs a consumer's own dev server
 * running, and the renderer never has to wait on a fetch for data the CLI
 * already has on disk. Torn down again once the recording finishes.
 */
async function startRendererServer(outDir: string): Promise<{ url: string; close: () => Promise<void> }> {
  const { createServer } = await import('node:http')
  // tsup's IIFE format always suffixes the output with `.global.js`
  // (see tsup.config.ts's second entry), regardless of the entry name.
  const rendererJsPath = path.join(cliDir, 'browser-renderer', 'main.global.js')
  if (!existsSync(rendererJsPath)) {
    throw new Error(`built-in renderer bundle not found at ${rendererJsPath} (this is a packaging bug)`)
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const send = (status: number, body: string | Buffer, ext: string) => {
      res.writeHead(status, { 'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream' })
      res.end(body)
    }
    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const visemesJson = readFileSync(path.join(outDir, 'narration-visemes.json'), 'utf-8')
        const scenesJson = readFileSync(path.join(outDir, 'narration-scenes.json'), 'utf-8')
        send(200, rendererPageHtml(visemesJson, scenesJson), '.html')
      } else if (url.pathname === '/main.js') {
        send(200, readFileSync(rendererJsPath), '.js')
      } else {
        // Video beats (`scene: video`) reference an asset living in `outDir`
        // (e.g. `public/`) by a path relative to it; serve those too, so the
        // page can play them via a plain <video src="/...">. Resolve+contain
        // within outDir first so a beat's `src` (or a crafted request) can
        // never escape it via `..`.
        const assetPath = path.join(outDir, decodeURIComponent(url.pathname))
        const relative = path.relative(outDir, assetPath)
        if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(assetPath)) {
          send(404, 'not found', '.html')
        } else {
          send(200, readFileSync(assetPath), path.extname(assetPath))
        }
      }
    } catch {
      send(404, 'not found', '.html')
    }
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('renderer server failed to bind a port')

  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  }
}

async function runRecord(args: GenerateArgs, durationSec: number): Promise<void> {
  let playwrightModule: typeof import('playwright')
  try {
    playwrightModule = await import('playwright')
  } catch {
    throw new Error('--record needs "playwright", which is not installed.\nInstall it with: npm install playwright')
  }
  const { chromium } = playwrightModule
  const { execFileSync } = await import('node:child_process')
  const { rmSync, readdirSync } = await import('node:fs')
  const os = await import('node:os')

  const recordDir = path.join(os.tmpdir(), `news-video-generator-record-${Date.now()}`)
  mkdirSync(recordDir, { recursive: true })

  const rendererServer = args.devUrl ? null : await startRendererServer(args.outDir)
  const devUrl = args.devUrl || rendererServer!.url

  try {
    console.log(`Recording ${devUrl} for ~${(durationSec + 1).toFixed(1)}s...`)
    const browser = await chromium.launch()
    const context = await browser.newContext({
      viewport: { width: args.width, height: args.height },
      recordVideo: { dir: recordDir, size: { width: args.width, height: args.height } },
    })
    const page = await context.newPage()
    await page.goto(devUrl)
    await page.waitForTimeout(Math.ceil((durationSec + 1) * 1000))
    await context.close()
    await browser.close()
  } finally {
    await rendererServer?.close()
  }

  const webm = readdirSync(recordDir).find((f) => f.endsWith('.webm'))
  if (!webm) throw new Error('playwright did not produce a video file')
  const webmPath = path.join(recordDir, webm)
  const silentPath = path.join(recordDir, 'silent.mp4')
  execFileSync('ffmpeg', ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', silentPath])

  mkdirSync(path.dirname(args.recordOut), { recursive: true })
  execFileSync('ffmpeg', [
    '-y',
    '-i',
    silentPath,
    '-i',
    path.join(args.outDir, 'narration.mp3'),
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-shortest',
    args.recordOut,
  ])
  rmSync(recordDir, { recursive: true, force: true })
  console.log(`Wrote ${args.recordOut}`)
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv
  if (command === 'generate') {
    await runGenerate(parseArgs(rest))
    return
  }
  printUsage()
  process.exit(command === undefined ? 0 : 1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
