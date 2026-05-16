import voroforce from '√/index'

import { store } from '../store'
import { initVoroforceIntegrations } from './integrations'
import type { VoroforceInstance } from './types'
import { getVoroforceConfig, getVoroforceConfigUniforms } from './utils'

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
  store.setState({
    container,
    voroforce: voroforce(container, config) as VoroforceInstance,
    config,
    configUniforms: getVoroforceConfigUniforms(config, state.mode, state.theme),
  })
  initVoroforceIntegrations()
}
