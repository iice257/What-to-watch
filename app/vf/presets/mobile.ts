import { VOROFORCE_MODE } from '../consts'
import type { VoroforceInstance } from '../types'

export const controlModeConfigs: {
  [K in VOROFORCE_MODE]?: VoroforceInstance['controls']['config']
} = {
  [VOROFORCE_MODE.select]: {
    maxSpeed: 4,
    ease: 0.1,
    easePinned: 0.1,
    freezeOnShake: {
      enabled: false,
    },
    freezeOnJolt: {
      enabled: false,
    },
    zoom: {
      enabled: true,
      min: 1,
      max: 1.4,
    },
  },
}

const defaultControlsConfig = {
  debug: false,
  autoFocusCenter: {
    enabled: true,
    random: true,
  },
  maxSpeed: 5,
  ease: 0.075,
  easePinned: 0.075,
  freezeOnShake: {
    enabled: true,
  },
  freezeOnJolt: {
    enabled: true,
  },
  zoom: {
    enabled: true,
    min: 1,
    max: 1.2,
  },
}

const controlsConfig = Object.assign(
  {
    default: defaultControlsConfig,
    modes: controlModeConfigs,
  },
  defaultControlsConfig,
)

export default {
  cells: 5000,
  multiThreading: {
    enabled: false, // TODO headers seem to be in order (SharedArrayBuffer exists) but black screen, used to work, needs triage (it works in local network though?!?)
    renderInParallel: true,
  },
  media: {
    compressionFormat: 'ktx',
  },
  controls: controlsConfig,
  display: {
    scene: {
      main: {
        uniforms: {
          fPixelSearchRadiusMod: {
            transition: true,
            initial: {
              value: 1, // abusing uniform transition mechanics to get some initial help and avoid broken pixels
            },
            modes: {
              default: {
                value: 0,
              },
              [VOROFORCE_MODE.select]: {
                value: 0,
              },
            },
          },
          fBorderRoundnessMod: {
            value: 1,
            transition: true,
            modes: {
              default: {
                value: 1,
              },
              select: {
                value: 1,
              },
            },
          },
          fBorderThicknessMod: {
            transition: true,
            modes: {
              default: {
                value: 1.5,
              },
              [VOROFORCE_MODE.select]: {
                value: 1.5,
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
              value: 1,
            },
            modes: {
              default: {
                value: 0,
              },
              [VOROFORCE_MODE.preview]: {
                value: 1.125,
              },
              [VOROFORCE_MODE.select]: {
                value: 1.125,
              },
            },
          },
          fCenterForceBulgeRadius: {
            transition: true,
            targetFactor: 0.0125,
            initial: {
              value: 1,
            },
            modes: {
              default: {
                value: 0,
              },
              [VOROFORCE_MODE.preview]: {
                value: 1,
              },
              [VOROFORCE_MODE.select]: {
                value: 1.75,
              },
            },
          },
          fWeightOffsetScaleMod: {
            transition: false,
            modes: {
              default: {
                value: 0,
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
      },
    },
  },
}
