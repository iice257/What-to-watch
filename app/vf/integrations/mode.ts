import { store } from '@/store'
import { baseLatticeConfig } from '../config'
import { updateUniformsByMode } from '../utils'

import { VOROFORCE_MODE } from '../consts'
import type { VoroforceCell } from '../types'
import { updateControlsByMode } from './controls'

const INTRO_LATTICE_SETTLE_MS = 250
const INTRO_PREVIEW_WARMUP_TICKS = 2
const MODE_INIT_RETRY_MS = 100
const MODE_INIT_RETRY_LIMIT = 100
const PRELOAD_REVEAL_FALLBACK_MS = 8000

export const revealVoroforceContainer = () => {
  store.getState().container?.classList.add('vf-scene-ready')
  store.setState({
    voroforceMediaPreloaded: true,
  })
}

let afterModeChangeTimeout: NodeJS.Timeout

const waitForVoroforceTicks = (count: number, callback: () => void) => {
  const ticker = store.getState().voroforce?.ticker
  if (!ticker || count <= 0) {
    callback()
    return
  }

  ticker.listenOnce('tick', () => {
    waitForVoroforceTicks(count - 1, callback)
  })
}

const handleModeChange = (mode: VOROFORCE_MODE): void => {
  const {
    setMode,
    voroforce,
    configUniforms: {
      main: mainUniforms,
      post: postUniforms,
      transitioning: transitioningUniforms,
    },
    config: {
      simulation: { forceStepModeConfigs },
      controls: controlsConfig,
    },
  } = store.getState()

  if (!voroforce?.simulation || !voroforce?.controls) return

  const { simulation, controls } = voroforce

  setMode(mode)

  updateControlsByMode(controls, mode, controlsConfig)
  updateUniformsByMode(mainUniforms, mode, transitioningUniforms)
  updateUniformsByMode(postUniforms, mode, transitioningUniforms)

  // when switching modes, temporarily up the neighbor searches in the shader to max supported level (voronoi cell propagation speed limits in shader)
  // updateUniforms(mainUniforms, {
  //   iForcedMaxNeighborLevel: 3,
  // })

  const forceStepConfig = forceStepModeConfigs[mode]
  if (forceStepConfig.parameters.velocityDecayTransitionEnterMode) {
    // when switching from select to preview mode, need to up velocityDecay during the transition (voronoi cell propagation speed limits in shader)
    forceStepConfig.parameters.velocityDecay =
      forceStepConfig.parameters.velocityDecayTransitionEnterMode

    simulation.updateForceStepConfig(forceStepConfig)

    clearTimeout(afterModeChangeTimeout)
    afterModeChangeTimeout = setTimeout(() => {
      // we revert back to default neighbor level as using max is extremely expensive
      // updateUniforms(mainUniforms, {
      //   iForcedMaxNeighborLevel: 0,
      // })

      // revert to default velocityDecay after the transition (voronoi cell propagation speed limits in shader, see above)
      forceStepConfig.parameters.velocityDecay =
        forceStepConfig.parameters.velocityDecayBase
      simulation.updateForceStepConfigParameters(forceStepConfig.parameters)
    }, forceStepConfig.parameters.transitionEnterModeDuration ?? 2000)
  } else {
    simulation.updateForceStepConfig(forceStepConfig)
  }
}
const handleIntro = (attempt = 0) => {
  const { voroforce, setPlayedIntro } = store.getState()

  if (!voroforce?.controls || !voroforce?.dimensions) {
    if (attempt < MODE_INIT_RETRY_LIMIT) {
      window.setTimeout(() => handleIntro(attempt + 1), MODE_INIT_RETRY_MS)
    }
    return
  }

  const { controls, dimensions } = voroforce

  setTimeout(() => {
    if (!voroforce) return

    voroforce.config.lattice = {
      ...baseLatticeConfig,
      rows: voroforce.config.lattice.rows,
      cols: voroforce.config.lattice.cols,
    }
    voroforce.resize()

    setTimeout(() => {
      handleModeChange(VOROFORCE_MODE.preview)

      controls.targetPointer = {
        x:
          dimensions.get('width') / 2 +
          (0.5 - Math.random()) * 0.05 * dimensions.get('width'),
        y:
          dimensions.get('height') / 2 +
          (0.5 - Math.random()) * 0.05 * dimensions.get('height'),
      }

      let revealed = false
      const revealIntro = () => {
        if (revealed) return
        revealed = true
        revealVoroforceContainer()
        setPlayedIntro(true)
      }

      waitForVoroforceTicks(INTRO_PREVIEW_WARMUP_TICKS, revealIntro)
      window.setTimeout(revealIntro, PRELOAD_REVEAL_FALLBACK_MS)
    }, INTRO_LATTICE_SETTLE_MS)
  }, 1000)
}

export const handleMode = (attempt = 0) => {
  const { mode: initialMode, voroforce, config } = store.getState()

  if (!voroforce?.loader || !voroforce?.ticker) {
    if (attempt < MODE_INIT_RETRY_LIMIT) {
      window.setTimeout(() => handleMode(attempt + 1), MODE_INIT_RETRY_MS)
    }
    return
  }

  const { loader, ticker } = voroforce

  if (initialMode === VOROFORCE_MODE.intro) {
    if (config.media.enabled && loader.loadingMediaLayers !== 0) {
      loader.listenOnce('idle', () => {
        // media will be uploaded on next tick
        ticker.listenOnce('tick', handleIntro)
      })
    } else {
      handleIntro()
    }
  } else {
    if (config.media.enabled && config.media.preload) {
      let revealed = false
      const revealAfterUpload = () => {
        if (revealed) return
        revealed = true
        // Prefer one tick for GPU upload, but never let a missed tick trap the intro.
        ticker.listenOnce('tick', revealVoroforceContainer)
        window.setTimeout(revealVoroforceContainer, 250)
      }

      loader.listenOnce('preloaded', revealAfterUpload)
      loader.listenOnce('idle', revealAfterUpload)

      if (loader.loadingMediaLayers === 0) {
        window.setTimeout(revealAfterUpload, 100)
      }
      window.setTimeout(revealAfterUpload, PRELOAD_REVEAL_FALLBACK_MS)
    } else {
      revealVoroforceContainer()
    }
  }

  if (voroforce.controls) {
    voroforce.controls.listen('selected', (async ({
      cell,
    }: { cell: VoroforceCell }) => {
      const mode = store.getState().mode
      if (mode === VOROFORCE_MODE.intro) return
      const newMode = cell ? VOROFORCE_MODE.select : VOROFORCE_MODE.preview
      if (newMode === mode) return
      handleModeChange(newMode)
    }) as unknown as EventListener)
  }
}
