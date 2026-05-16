import { VOROFORCE_MODE } from '../consts'
import type { VoroforceInstance } from '../types'
import controls, { controlModeConfigs } from './controls'
import display from './display'
import { baseLatticeConfig, introModeLatticeConfig } from './lattice'
import media from './media'
import simulation from './simulation'
import { introForceSimulationStepConfig } from './simulation/force/intro-force'

export const modeConfigs: {
  [K in VOROFORCE_MODE]?: Partial<VoroforceInstance['config']>
} = {
  [VOROFORCE_MODE.intro]: {
    lattice: introModeLatticeConfig,
    simulation: {
      steps: {
        force: introForceSimulationStepConfig,
      },
    },
    media: {
      preload: 'v0', // default is "first" but "high" and "mid" media versions are loaded via "intro" lattice setup
    },
  },
  [VOROFORCE_MODE.select]: {
    controls: controlModeConfigs[VOROFORCE_MODE.select],
  },
}

export default {
  media,
  controls,
  display,
  simulation,
  cells: 10000,
  multiThreading: {
    enabled: true,
    renderInParallel: true,
  },
  devTools: {
    enabled: false,
    expanded: false,
    expandedFolders: {
      simulation: false,
      display: false,
    },
  },
  handleVisibilityChange: {
    enabled: true,
    hiddenDelay: 5000,
  },
  lattice: baseLatticeConfig,
  modes: modeConfigs,
}
