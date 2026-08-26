import type { LanguageCode, VoiceId } from '@aws-sdk/client-polly'
import type { VisemeCue } from '../schema/script'
import type { NarrationProvider, NarrationResult, NarrationSegment, SegmentTiming } from './provider'

export interface PollyNarrationOptions {
  voiceId?: string
  engine?: 'neural' | 'standard'
  languageCode?: string
  region?: string
}

const DEFAULT_VOICE_ID = 'Takumi'
const DEFAULT_ENGINE = 'neural'
const DEFAULT_LANGUAGE_CODE = 'ja-JP'
// Padding after the last viseme so a fixed-length recording never cuts off
// the final syllable's tail.
const TRAILING_PAD_SEC = 0.6
const FALLBACK_DURATION_SEC = 3

interface RawSpeechMark {
  time: number
  type: string
  value: string
}

function escapeSsml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildMarkedSsml(segments: NarrationSegment[]): string {
  const body = segments.reduce((acc, segment, i) => {
    const mark = i > 0 ? `<mark name="cut${i - 1}"/>` : ''
    return acc + mark + escapeSsml(segment.text)
  }, '')
  return `<speak><prosody rate="100%">${body}</prosody></speak>`
}

/**
 * AWS Polly implementation of `NarrationProvider`. `@aws-sdk/client-polly`
 * is an optional dependency of this package (dynamically imported here) —
 * install it yourself (`npm install @aws-sdk/client-polly`) to use this
 * provider; the rest of the library has no TTS/cloud dependency at all.
 *
 * Segment boundaries come from Polly's own `<mark>` timestamps (requesting
 * `SpeechMarkTypes: ['viseme', 'ssml']` in the same call), not a guessed
 * split — so cuts land exactly on sentence boundaries.
 */
export function createPollyNarrationProvider(options: PollyNarrationOptions = {}): NarrationProvider {
  const voiceId = options.voiceId ?? DEFAULT_VOICE_ID
  const engine = options.engine ?? DEFAULT_ENGINE
  const languageCode = options.languageCode ?? DEFAULT_LANGUAGE_CODE

  return {
    async synthesize(segments: NarrationSegment[]): Promise<NarrationResult> {
      if (segments.length === 0) throw new Error('createPollyNarrationProvider: at least one segment is required')

      let PollyModule: typeof import('@aws-sdk/client-polly')
      try {
        PollyModule = await import('@aws-sdk/client-polly')
      } catch {
        throw new Error(
          'The Polly narration provider needs "@aws-sdk/client-polly", which is not installed.\n' +
            'Install it with: npm install @aws-sdk/client-polly',
        )
      }
      const { PollyClient, SynthesizeSpeechCommand } = PollyModule

      const ssml = buildMarkedSsml(segments)
      const client = new PollyClient(options.region ? { region: options.region } : {})

      const audioRes = await client.send(
        new SynthesizeSpeechCommand({
          TextType: 'ssml',
          Text: ssml,
          OutputFormat: 'mp3',
          VoiceId: voiceId as VoiceId,
          Engine: engine,
          LanguageCode: languageCode as LanguageCode,
        }),
      )
      const audio = await audioRes.AudioStream?.transformToByteArray()
      if (!audio) throw new Error('Polly returned no audio stream')

      const marksRes = await client.send(
        new SynthesizeSpeechCommand({
          TextType: 'ssml',
          Text: ssml,
          OutputFormat: 'json',
          VoiceId: voiceId as VoiceId,
          Engine: engine,
          LanguageCode: languageCode as LanguageCode,
          SpeechMarkTypes: ['viseme', 'ssml'],
        }),
      )
      const marksBytes = await marksRes.AudioStream?.transformToByteArray()
      if (!marksBytes) throw new Error('Polly returned no speech marks')

      const marksLines: string[] = Buffer.from(marksBytes).toString('utf-8').split('\n')
      const allMarks: RawSpeechMark[] = marksLines
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => JSON.parse(line) as RawSpeechMark)

      const visemes: VisemeCue[] = allMarks
        .filter((mark) => mark.type === 'viseme')
        // Polly times are milliseconds; VisemeCue expects seconds.
        .map((mark) => ({ time: mark.time / 1000, viseme: mark.value }))

      const cutTimesSec = allMarks
        .filter((mark) => mark.type === 'ssml')
        .sort((a, b) => a.time - b.time)
        .map((mark) => mark.time / 1000)

      const durationSec =
        visemes.length > 0 ? (visemes[visemes.length - 1]?.time ?? 0) + TRAILING_PAD_SEC : FALLBACK_DURATION_SEC

      const boundaries = [0, ...cutTimesSec, durationSec]
      const segmentTimings: SegmentTiming[] = segments.map((segment, i) => ({
        id: segment.id,
        start: boundaries[i]!,
        end: boundaries[i + 1]!,
      }))

      return { audio, durationSec, visemes, segmentTimings }
    },
  }
}
