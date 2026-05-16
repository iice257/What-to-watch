import { useMemo } from 'react'
import { VOROFORCE_MODE } from '../vf/consts'
import type { StoreState } from './index'

// Memoized selectors for derived state
export const createModeSelectors = () => {
  // Cache the derived state to avoid recalculation
  const modeCache = new Map<
    VOROFORCE_MODE,
    {
      isSelectMode: boolean
      isPreviewMode: boolean
      isIntroMode: boolean
    }
  >()

  const getModeFlags = (mode: VOROFORCE_MODE) => {
    if (!modeCache.has(mode)) {
      modeCache.set(mode, {
        isSelectMode: mode === VOROFORCE_MODE.select,
        isPreviewMode: mode === VOROFORCE_MODE.preview,
        isIntroMode: mode === VOROFORCE_MODE.intro,
      })
    }
    const result = modeCache.get(mode)
    if (!result) {
      throw new Error(`Mode ${mode} not found in cache`)
    }
    return result
  }

  return getModeFlags
}

// Create singleton instance of mode selector
const getModeFlags = createModeSelectors()

// Base selectors
export const selectMode = (state: StoreState) => state.mode

export const selectModeFlags = (state: StoreState) => getModeFlags(state.mode)

export const selectIsSelectMode = (state: StoreState) =>
  state.mode === VOROFORCE_MODE.select

export const selectIsPreviewMode = (state: StoreState) =>
  state.mode === VOROFORCE_MODE.preview

export const selectIsIntroMode = (state: StoreState) =>
  state.mode === VOROFORCE_MODE.intro

// UI state selectors
export const selectTheme = (state: StoreState) => state.theme

export const selectModalsOpen = (state: StoreState) => ({
  settings: state.settingsOpen,
  about: state.aboutOpen,
  favorites: state.favoritesOpen,
  addCustomLinkType: state.addCustomLinkTypeOpen,
})

export const selectAnyModalOpen = (state: StoreState) =>
  state.settingsOpen ||
  state.aboutOpen ||
  state.favoritesOpen ||
  !!state.addCustomLinkTypeOpen

// Engine state selectors
export const selectVoroforceReady = (state: StoreState) =>
  !!state.voroforce && state.voroforceMediaPreloaded

export const selectDeviceInfo = (state: StoreState) => ({
  deviceClass: state.deviceClass,
  estimatedDeviceClass: state.estimatedDeviceClass,
  cellLimit: state.cellLimit,
  preset: state.preset,
})

export const selectPerformanceConfig = (state: StoreState) => ({
  voroforceDevSceneEnabled: state.voroforceDevSceneEnabled,
  performanceMonitor: state.performanceMonitor,
  userConfig: state.userConfig,
})

// Film data selectors
export const selectCurrentFilm = (state: StoreState) => state.film

export const selectFilmData = (state: StoreState) => ({
  film: state.film,
  filmBatches: state.filmBatches,
})

// Composite selectors for common use cases
export const selectAppReadiness = (state: StoreState) => ({
  voroforceReady: !!state.voroforce && state.voroforceMediaPreloaded,
  playedIntro: state.playedIntro,
  mode: state.mode,
  isReady: !!state.voroforce && state.voroforceMediaPreloaded && !!state.preset,
})

// Hook-based selectors with memoization
export const useModeFlags = (mode: VOROFORCE_MODE) => {
  return useMemo(() => getModeFlags(mode), [mode])
}

export const useModalState = (
  modalKey: keyof ReturnType<typeof selectModalsOpen>,
) => {
  return useMemo(
    () => (state: StoreState) => selectModalsOpen(state)[modalKey],
    [modalKey],
  )
}
