import { VOROFORCE_MODE } from '../../consts'
import type { VoroforceInstance } from '../../types'

export const controlModeConfigs: {
  [K in VOROFORCE_MODE]?: VoroforceInstance['controls']['config']
} = {
  [VOROFORCE_MODE.select]: {
    maxSpeed: 14,
    ease: 0.35,
    easePinned: 0.45,
    freezeOnShake: {
      enabled: false,
    },
    freezeOnJolt: {
      enabled: false,
    },
    zoom: {
      enabled: true,
      min: 1,
      max: 1.08,
    },
  },
}

const defaultControlsConfig = {
  debug: false,
  autoFocusCenter: {
    enabled: true,
    random: true,
  },
  maxSpeed: 18,
  ease: 0.28,
  easePinned: 0.35,
  freezeOnShake: {
    enabled: false,
  },
  freezeOnJolt: {
    enabled: false,
  },
  zoom: {
    enabled: true,
    min: 1,
    max: 1.5,
  },
}

export default Object.assign(
  {
    default: defaultControlsConfig,
    modes: controlModeConfigs,
  },
  defaultControlsConfig,
)
