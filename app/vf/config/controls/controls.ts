import { VOROFORCE_MODE } from '../../consts'
import type { VoroforceInstance } from '../../types'

export const controlModeConfigs: {
  [K in VOROFORCE_MODE]?: VoroforceInstance['controls']['config']
} = {
  [VOROFORCE_MODE.select]: {
    maxSpeed: 4,
    ease: 0.1,
    easePinned: 0.25,
    freezeOnShake: {
      enabled: false,
    },
    freezeOnJolt: {
      enabled: false,
    },
    zoom: {
      enabled: true,
      min: 1,
      max: 1.01,
    },
  },
}

const defaultControlsConfig = {
  debug: false,
  autoFocusCenter: {
    enabled: true,
    random: true,
  },
  maxSpeed: 10,
  ease: 0.15,
  easePinned: 0.15,
  freezeOnShake: {
    enabled: true,
  },
  freezeOnJolt: {
    enabled: true,
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
