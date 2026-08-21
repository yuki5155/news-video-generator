import { describe, expect, it, vi } from 'vitest'
import { createTelop } from './createTelop'

function fakeCanvas() {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
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

  it('throws a clear error when no DOM canvas is available and none is injected', () => {
    // vitest runs in plain Node here (no `document`), so the default
    // createCanvas path should fail with our explicit error rather than a
    // cryptic ReferenceError.
    expect(() => createTelop('速報')).toThrow(/browser DOM canvas/)
  })
})
