import { handleControls } from './controls'
import { handleMode } from './mode'
import { handleTheme } from './theme'
import { handleTicker } from './ticker'
// import { handleDebug } from './debug'

export * from './controls'
export * from './mode'
export * from './theme'
export * from './ticker'
// export * from './debug'

export const initVoroforceIntegrations = () => {
  handleControls()
  handleMode()
  handleTheme()
  handleTicker()
  // handleDebug()
}
