import { THEME } from '../../../consts'
import { VOROFORCE_MODE } from '../../consts'
import mainFrag from './main.frag'

const parsePositiveNumberEnv = (
  value: string | undefined,
): number | undefined => {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

const isWindowsChromiumRuntime = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  return (
    /Windows/i.test(userAgent) && /\b(Chrome|Chromium|Edg)\//i.test(userAgent)
  )
}

const isChromiumRuntime = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return /\b(Chrome|Chromium|Edg|OPR|CriOS)\//i.test(userAgent)
}

const getRenderPixelRatio = () => {
  const envPixelRatio = parsePositiveNumberEnv(
    import.meta.env.VITE_RENDER_PIXEL_RATIO,
  )
  if (envPixelRatio) return envPixelRatio

  const devicePixelRatio =
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const viewportPixels =
    typeof window !== 'undefined' ? window.innerWidth * window.innerHeight : 0
  const phoneViewportCap =
    viewportPixels > 0 && viewportPixels < 520_000 ? 1.05 : 1.25
  const windowsChromiumCap = viewportPixels >= 1_800_000 ? 0.72 : 0.85
  const chromiumCap = viewportPixels >= 1_800_000 ? 0.85 : 1

  return Math.min(
    devicePixelRatio,
    isWindowsChromiumRuntime()
      ? windowsChromiumCap
      : isChromiumRuntime()
        ? chromiumCap
        : phoneViewportCap,
  )
}

const getPixelSearchRadiusMod = (value: number) => value

export default {
  scene: {
    dev: {
      enabled: false,
    },
    main: {
      fragmentShader: mainFrag,
      uniforms: {
        iForcedMaxNeighborLevel: { value: 0 },
        fPixelSearchRadiusMod: {
          transition: true,
          modes: {
            default: {
              value: getPixelSearchRadiusMod(1),
            },
            [VOROFORCE_MODE.select]: {
              value: getPixelSearchRadiusMod(2),
            },
          },
        },
        bMediaDistortion: { value: false },
        fMediaBboxScale: { value: 1 },
        fBaseColor: {
          transition: true,
          themes: {
            default: {
              value: [0, 0, 0],
            },
            [THEME.light]: {
              // value: [1, 1, 1],
              value: [
                0.6823529411764706, 0.6352941176470588, 0.5882352941176471,
              ],
            },
          },
        },
        fBorderRoundnessMod: {
          transition: true,
          modes: {
            default: {
              // value: 1,
              value: 0.75,
            },
            [VOROFORCE_MODE.select]: {
              // value: 3,
              value: 0.75,
            },
          },
        },
        fBorderThicknessMod: {
          transition: true,
          modes: {
            default: {
              value: 1,
            },
            [VOROFORCE_MODE.select]: {
              value: 1,
            },
          },
        },
        fBorderSmoothnessMod: {
          transition: true,
          modes: {
            default: {
              value: 1,
            },
            [VOROFORCE_MODE.select]: {
              value: 0.75,
            },
          },
        },
        fCenterForceBulgeStrength: {
          transition: true,
          targetFactor: 0.0125,
          initial: {
            value: 0.25,
          },
          modes: {
            default: {
              value: 0,
            },
            [VOROFORCE_MODE.preview]: {
              value: 0.75,
              // value: 0,
            },
            [VOROFORCE_MODE.select]: {
              value: 1.5,
            },
          },
        },
        fCenterForceBulgeRadius: {
          transition: true,
          targetFactor: 0.0125,
          initial: {
            value: 0.25,
          },
          modes: {
            default: {
              value: 0,
            },
            [VOROFORCE_MODE.preview]: {
              value: 0.75,
            },
            [VOROFORCE_MODE.select]: {
              value: 3.5,
            },
          },
        },
        fWeightOffsetScaleMod: {
          transition: true,
          modes: {
            default: {
              value: 0.25,
              // value: 0,
            },
            [VOROFORCE_MODE.select]: {
              // value: 1,
              value: 0,
            },
          },
        },
        fWeightOffsetScaleMediaMod: {
          value: 1,
        },
        fUnweightedEffectMod: {
          transition: true,
          initial: {
            value: 0,
          },
          modes: {
            [VOROFORCE_MODE.preview]: {
              value: 1,
            },
            [VOROFORCE_MODE.select]: {
              value: 1,
            },
          },
        },
        fOuterMotionBlurMod: {
          value: 0.16,
        },
        fBaseXDistScale: {
          transition: true,
          modes: {
            default: {
              value: 1.5, // 0 = undefined, will use fallback
            },
            [VOROFORCE_MODE.select]: {
              // value: 1,
              value: 1.5,
            },
          },
        },
        fWeightedXDistScale: {
          transition: true,
          modes: {
            default: {
              value: 1.5, // 0 = undefined, will use fallback
            },
            [VOROFORCE_MODE.select]: {
              // value: 1,
              value: 1.5,
            },
          },
        },
        fRippleMod: {
          transition: true,
          modes: {
            default: {
              value: 1,
            },
            [VOROFORCE_MODE.select]: {
              value: 0,
            },
          },
        },
        fNoiseOctaveMod: {
          transition: true,
          modes: {
            default: {
              value: 1,
            },
            [VOROFORCE_MODE.select]: {
              value: 0,
            },
          },
        },
        fNoiseCenterOffsetMod: {
          transition: true,
          modes: {
            default: {
              value: 1,
            },
            [VOROFORCE_MODE.select]: {
              value: 0,
            },
          },
        },
      },
    },
    post: {
      enabled: false,
      fragmentShader: undefined,
      uniforms: {},
    },
  },
  renderer: {
    pixelRatio: getRenderPixelRatio(),
  },
}
