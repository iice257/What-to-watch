import { mergeConfigs } from '√'
import { store } from '../../store'
import { VOROFORCE_MODE } from '../consts'
import type { VoroforceCell, VoroforceInstance } from '../types'
import { getCellFilm } from '../utils'

const CONTROLS_INIT_RETRY_MS = 100
const CONTROLS_INIT_RETRY_LIMIT = 100

export const handleControls = (attempt = 0) => {
  const {
    setFilm,
    voroforce,
    filmBatches,
    configUniforms: {
      main: mainUniforms,
      transitioning: transitioningUniforms,
    },
    mode,
  } = store.getState()

  if (!voroforce?.controls) {
    if (attempt < CONTROLS_INIT_RETRY_LIMIT) {
      window.setTimeout(
        () => handleControls(attempt + 1),
        CONTROLS_INIT_RETRY_MS,
      )
    }
    return
  }

  const { controls, ticker } = voroforce
  let focusedFilmRequest = 0
  let selectedFilmRequest = 0

  const setFocusedFilm = async (cell?: VoroforceCell) => {
    const requestId = ++focusedFilmRequest
    if (!cell) return
    const film = await getCellFilm(cell, filmBatches)
    if (requestId === focusedFilmRequest && controls.cells?.focused === cell) {
      setFilm(film)
    }
  }

  const setSelectedFilm = async (cell?: VoroforceCell) => {
    const requestId = ++selectedFilmRequest
    if (!cell) return
    const film = await getCellFilm(cell, filmBatches)
    if (
      requestId === selectedFilmRequest &&
      controls.cells?.selected === cell
    ) {
      setFilm(film)
    }
  }

  const syncCurrentFilm = () => {
    const selectedCell = controls.cells?.selected
    if (selectedCell) {
      void setSelectedFilm(selectedCell)
      return
    }
    void setFocusedFilm(controls.cells?.focused)
  }

  controls.listen('focused', (async ({ cell }: { cell: VoroforceCell }) => {
    await setFocusedFilm(cell)
  }) as unknown as EventListener)

  controls.listen('selected', (async ({ cell }: { cell: VoroforceCell }) => {
    if (cell) {
      await setSelectedFilm(cell)
      // controls.pinPointer()
    } else {
      // controls.unpinPointer()
    }
  }) as unknown as EventListener)

  syncCurrentFilm()
  ticker?.listenOnce('tick', syncCurrentFilm)

  controls.listen('pointerFrozenChange', (async ({
    frozen,
  }: { frozen: boolean }) => {
    const uniformKey = 'fUnweightedEffectMod'
    const uniform = mainUniforms.get(uniformKey)
    if (!uniform) return
    const value =
      [VOROFORCE_MODE.preview, VOROFORCE_MODE.select].includes(mode) && frozen
        ? 1
        : 0
    if (transitioningUniforms && uniform.transition) {
      if (uniform.value !== value) {
        uniform.targetValue = value
        if (!transitioningUniforms.has(uniformKey)) {
          transitioningUniforms.set(uniformKey, uniform)
        }
      }
    } else {
      uniform.value = value
    }
  }) as unknown as EventListener)
}

export const updateControlsByMode = (
  controls: VoroforceInstance['controls'],
  mode: VOROFORCE_MODE,
  controlsConfig: VoroforceInstance['config']['controls'],
) => {
  controls.updateConfig(
    mergeConfigs(controlsConfig.default, controlsConfig.modes?.[mode]),
  )
}
