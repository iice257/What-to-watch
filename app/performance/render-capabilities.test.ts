import { describe, expect, it } from 'vitest'
import { getRenderCapabilities } from './render-capabilities'

describe('render capabilities', () => {
  it('uses a conservative profile for Chromium on Windows', () => {
    const result = getRenderCapabilities({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
      viewportPixels: 2_000_000,
    })
    expect(result).toMatchObject({
      isChromiumDesktop: true,
      pixelRatioCap: 0.7,
      targetFps: 38,
    })
  })

  it('recognizes touch-capable iPad runtimes', () => {
    expect(
      getRenderCapabilities({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
        maxTouchPoints: 5,
      }).isMobileLike,
    ).toBe(true)
  })
})
