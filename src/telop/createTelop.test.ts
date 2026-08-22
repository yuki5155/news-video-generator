import { describe, expect, it, vi } from 'vitest'
import { createTelop } from './createTelop'

function fakeCanvas() {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    // Approximates real canvas metrics well enough to test shrink/wrap logic:
    // width scales with both character count and the currently set font size.
    measureText: vi.fn((text: string) => {
      const fontSize = Number(/(\d+)px/.exec(ctx.font)?.[1] ?? 16)
      return { width: text.length * fontSize * 0.6 } as TextMetrics
    }),
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  }
  return {
    width: 0,
    height: 0,
    getContext: () => ctx as unknown as CanvasRenderingContext2D,
    _ctx: ctx,
  }
}

describe('createTelop', () => {
  it('starts visible and toggles with setVisible/show/hide semantics', () => {
    const canvas = fakeCanvas()
    const telop = createTelop('速報', { createCanvas: () => canvas })

    expect(telop.isVisible()).toBe(true)

    telop.setVisible(false)
    expect(telop.isVisible()).toBe(false)
    expect(telop.object.visible).toBe(false)

    telop.setVisible(true)
    expect(telop.isVisible()).toBe(true)
  })

  it('redraws the canvas when the text changes', () => {
    const canvas = fakeCanvas()
    createTelop('速報', { createCanvas: () => canvas })
    const callsAfterCreate = canvas._ctx.fillText.mock.calls.length

    const telop2 = createTelop('', { createCanvas: () => canvas })
    telop2.setText('続報')

    expect(canvas._ctx.fillText.mock.calls.length).toBeGreaterThan(callsAfterCreate)
    expect(canvas._ctx.fillText.mock.calls.at(-1)?.[0]).toBe('続報')
  })

  it('keeps short text on a single line at full size', () => {
    const canvas = fakeCanvas()
    createTelop('速報', { createCanvas: () => canvas })

    expect(canvas._ctx.fillText.mock.calls.length).toBe(1)
    const fontPx = Number(/(\d+)px/.exec(canvas._ctx.font)?.[1])
    expect(fontPx).toBe(Math.round(140 * 0.42))
  })

  it('shrinks the font to fit long text on one line before it starts wrapping', () => {
    const canvas = fakeCanvas()
    createTelop('あ'.repeat(40), { createCanvas: () => canvas })

    expect(canvas._ctx.fillText.mock.calls.length).toBe(1)
    const fontPx = Number(/(\d+)px/.exec(canvas._ctx.font)?.[1])
    expect(fontPx).toBeLessThan(Math.round(140 * 0.42))
    expect(fontPx).toBeGreaterThanOrEqual(Math.round(140 * 0.22))
  })

  it('wraps onto multiple lines once shrinking alone cannot fit the text', () => {
    const canvas = fakeCanvas()
    createTelop('あ'.repeat(200), { createCanvas: () => canvas })

    expect(canvas._ctx.fillText.mock.calls.length).toBeGreaterThan(1)
    // Every wrapped line must still individually fit the available width.
    const maxWidth = 1024 - 1024 * 0.04 * 2
    for (const [line] of canvas._ctx.fillText.mock.calls) {
      expect(canvas._ctx.measureText(line as string).width).toBeLessThanOrEqual(maxWidth)
    }
  })

  it('throws a clear error when no DOM canvas is available and none is injected', () => {
    // vitest runs in plain Node here (no `document`), so the default
    // createCanvas path should fail with our explicit error rather than a
    // cryptic ReferenceError.
    expect(() => createTelop('速報')).toThrow(/browser DOM canvas/)
  })
})
