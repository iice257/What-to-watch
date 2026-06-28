export const RENDER_PROFILE_IDS = {
  default: 'default',
  chromiumDesktop: 'chromium-desktop',
} as const

export type RenderProfileId =
  (typeof RENDER_PROFILE_IDS)[keyof typeof RENDER_PROFILE_IDS]

type ShaderDefineValue = string | number | boolean | null | undefined

export type RenderProfile = {
  id: RenderProfileId
  label: string
  desktopRandomGridCells: number
  tickerFpsCap?: number
  outerMotionBlurMod: number
  shaderDefines: Record<string, ShaderDefineValue>
}

type RenderProfileOptions = {
  isMobileRuntime?: boolean
  maxTouchPoints?: number
  override?: string | null
  userAgent?: string
}

export const DEFAULT_DESKTOP_RANDOM_GRID_CELLS = 10000
export const CHROMIUM_DESKTOP_RANDOM_GRID_CELLS = 7000

export const renderProfiles: Record<RenderProfileId, RenderProfile> = {
  [RENDER_PROFILE_IDS.default]: {
    id: RENDER_PROFILE_IDS.default,
    label: 'Default',
    desktopRandomGridCells: DEFAULT_DESKTOP_RANDOM_GRID_CELLS,
    outerMotionBlurMod: 0.16,
    shaderDefines: {},
  },
  [RENDER_PROFILE_IDS.chromiumDesktop]: {
    id: RENDER_PROFILE_IDS.chromiumDesktop,
    label: 'Chromium Desktop',
    desktopRandomGridCells: CHROMIUM_DESKTOP_RANDOM_GRID_CELLS,
    tickerFpsCap: 38,
    outerMotionBlurMod: 0.24,
    shaderDefines: {
      MAX_NEIGHBORS_LEVEL_1: '5u',
      MEDIA_BBOX_MAX_NEIGHBORS: '8u',
    },
  },
}

export const normalizeRenderProfileId = (
  value?: string | null,
): RenderProfileId | undefined => {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return

  if (
    normalized === RENDER_PROFILE_IDS.chromiumDesktop ||
    normalized === 'chromium' ||
    normalized === 'chrome-desktop' ||
    normalized === 'chromium_desktop'
  ) {
    return RENDER_PROFILE_IDS.chromiumDesktop
  }

  if (normalized === RENDER_PROFILE_IDS.default) {
    return RENDER_PROFILE_IDS.default
  }
}

const getRuntimeUserAgent = () =>
  typeof navigator !== 'undefined' ? navigator.userAgent : ''

const getRuntimeMaxTouchPoints = () =>
  typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0

const getRuntimeOverride = () =>
  normalizeRenderProfileId(import.meta.env.VITE_RENDER_PROFILE)

const isMobileLikeRuntime = ({
  isMobileRuntime,
  maxTouchPoints = getRuntimeMaxTouchPoints(),
  userAgent = getRuntimeUserAgent(),
}: RenderProfileOptions) =>
  Boolean(isMobileRuntime) ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent,
  ) ||
  (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)

export const isChromiumDesktopRuntime = ({
  isMobileRuntime,
  maxTouchPoints,
  userAgent = getRuntimeUserAgent(),
}: RenderProfileOptions = {}) =>
  !isMobileLikeRuntime({ isMobileRuntime, maxTouchPoints, userAgent }) &&
  /\b(Chrome|Chromium|Edg|OPR)\//i.test(userAgent) &&
  !/\b(CriOS|EdgiOS|OPiOS)\//i.test(userAgent)

export const getRenderProfile = (
  options: RenderProfileOptions = {},
): RenderProfile => {
  const override =
    normalizeRenderProfileId(options.override) ?? getRuntimeOverride()
  if (override) return renderProfiles[override]

  if (isChromiumDesktopRuntime(options)) {
    return renderProfiles[RENDER_PROFILE_IDS.chromiumDesktop]
  }

  return renderProfiles[RENDER_PROFILE_IDS.default]
}

export const getRenderProfilePixelRatioCap = (
  profile: RenderProfile,
  {
    userAgent = getRuntimeUserAgent(),
    viewportPixels = typeof window !== 'undefined'
      ? window.innerWidth * window.innerHeight
      : 0,
  }: {
    userAgent?: string
    viewportPixels?: number
  } = {},
) => {
  if (profile.id !== RENDER_PROFILE_IDS.chromiumDesktop) {
    return viewportPixels > 0 && viewportPixels < 520_000 ? 1.05 : 1.25
  }

  if (/Windows/i.test(userAgent)) {
    return viewportPixels >= 1_800_000 ? 0.7 : 0.82
  }

  return viewportPixels >= 1_800_000 ? 0.82 : 0.96
}
