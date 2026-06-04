import voroforce from '√/index'

import { store } from '../store'
import { initVoroforceIntegrations } from './integrations'
import type { VoroforceInstance } from './types'
import { getVoroforceConfig, getVoroforceConfigUniforms } from './utils'

declare global {
  interface Window {
    __W2W_GRID__?: {
      cells: number
      randomCellSelection?: VoroforceInstance['config']['media']['randomCellSelection']
      mediaPreload?: VoroforceInstance['config']['media']['preload']
      renderProfile?: string
      rendererPixelRatio?: number
      tickerFpsCap?: VoroforceInstance['config']['ticker']['fpsCap']
      multiThreading?: VoroforceInstance['config']['multiThreading']
    }
  }
}

export const initVoroforce = ({
  // biome-ignore lint/style/noNonNullAssertion: exists
  container = document.getElementById('voroforce')!,
  force,
}: {
  container?: HTMLElement
  force?: boolean
} = {}) => {
  const state = store.getState()
  if (state.voroforce) return // already initialized
  if (!force && !state.preset) return

  const config = getVoroforceConfig(state)
  window.__W2W_GRID__ = {
    cells: config.cells,
    randomCellSelection: config.media.randomCellSelection,
    mediaPreload: config.media.preload,
    renderProfile: config.display.renderProfile?.id,
    rendererPixelRatio: config.display.renderer?.pixelRatio,
    tickerFpsCap: config.ticker?.fpsCap,
    multiThreading: config.multiThreading,
  }
  store.setState({
    container,
    voroforce: voroforce(container, config) as VoroforceInstance,
    config,
    configUniforms: getVoroforceConfigUniforms(config, state.mode, state.theme),
  })
  initVoroforceIntegrations()
}
