import { describe, expect, it } from 'vitest'
import {
  RENDER_PROFILE_IDS,
  getRenderProfile,
  getRenderProfilePixelRatioCap,
  isChromiumDesktopRuntime,
  normalizeRenderProfileId,
  renderProfiles,
} from './render-profile'

const WINDOWS_EDGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0'
const MAC_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'

describe('render profiles', () => {
  it('selects the Chromium desktop profile for desktop Chromium runtimes', () => {
    expect(isChromiumDesktopRuntime({ userAgent: WINDOWS_EDGE_UA })).toBe(true)
    expect(getRenderProfile({ userAgent: WINDOWS_EDGE_UA }).id).toBe(
      RENDER_PROFILE_IDS.chromiumDesktop,
    )
    expect(
      getRenderProfile({ userAgent: WINDOWS_EDGE_UA }).shaderDefines
        .MAX_NEIGHBORS_LEVEL_1,
    ).toBe('5u')
    expect(getRenderProfile({ userAgent: WINDOWS_EDGE_UA }).tickerFpsCap).toBe(
      38,
    )
  })

  it('keeps Safari and mobile Chromium on the default profile', () => {
    expect(getRenderProfile({ userAgent: MAC_SAFARI_UA }).id).toBe(
      RENDER_PROFILE_IDS.default,
    )
    expect(
      getRenderProfile({
        isMobileRuntime: true,
        userAgent: ANDROID_CHROME_UA,
      }).id,
    ).toBe(RENDER_PROFILE_IDS.default)
  })

  it('supports explicit profile overrides for A/B checks', () => {
    expect(normalizeRenderProfileId('chromium')).toBe(
      RENDER_PROFILE_IDS.chromiumDesktop,
    )
    expect(
      getRenderProfile({
        override: 'default',
        userAgent: WINDOWS_EDGE_UA,
      }).id,
    ).toBe(RENDER_PROFILE_IDS.default)
    expect(
      getRenderProfile({
        override: 'chromium-desktop',
        userAgent: MAC_SAFARI_UA,
      }).id,
    ).toBe(RENDER_PROFILE_IDS.chromiumDesktop)
  })

  it('uses Chromium desktop pixel-ratio caps only for the Chromium desktop profile', () => {
    expect(
      getRenderProfilePixelRatioCap(
        renderProfiles[RENDER_PROFILE_IDS.chromiumDesktop],
        {
          userAgent: WINDOWS_EDGE_UA,
          viewportPixels: 1920 * 1080,
        },
      ),
    ).toBe(0.7)
    expect(
      getRenderProfilePixelRatioCap(
        renderProfiles[RENDER_PROFILE_IDS.default],
        {
          userAgent: WINDOWS_EDGE_UA,
          viewportPixels: 1920 * 1080,
        },
      ),
    ).toBe(1.25)
  })
})
