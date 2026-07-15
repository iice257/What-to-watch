export type RenderCapabilities = {
  isMobileLike: boolean
  isChromiumDesktop: boolean
  pixelRatioCap: number
  targetFps: number
}

export type RenderCapabilityOptions = {
  maxTouchPoints?: number
  userAgent?: string
  viewportPixels?: number
}

const runtimeUserAgent = () =>
  typeof navigator === 'undefined' ? '' : navigator.userAgent

const runtimeTouchPoints = () =>
  typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints

const runtimeViewportPixels = () =>
  typeof window === 'undefined' ? 0 : window.innerWidth * window.innerHeight

export const getRenderCapabilities = ({
  maxTouchPoints = runtimeTouchPoints(),
  userAgent = runtimeUserAgent(),
  viewportPixels = runtimeViewportPixels(),
}: RenderCapabilityOptions = {}): RenderCapabilities => {
  const isMobileLike =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    ) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  const isChromiumDesktop =
    !isMobileLike &&
    /\b(Chrome|Chromium|Edg|OPR)\//i.test(userAgent) &&
    !/\b(CriOS|EdgiOS|OPiOS)\//i.test(userAgent)

  let pixelRatioCap =
    viewportPixels > 0 && viewportPixels < 520_000 ? 1.05 : 1.25
  if (isChromiumDesktop) {
    const largeViewport = viewportPixels >= 1_800_000
    pixelRatioCap = /Windows/i.test(userAgent)
      ? largeViewport
        ? 0.7
        : 0.82
      : largeViewport
        ? 0.82
        : 0.96
  }

  return {
    isMobileLike,
    isChromiumDesktop,
    pixelRatioCap,
    targetFps: isChromiumDesktop ? 38 : 60,
  }
}
