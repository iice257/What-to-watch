import { beforeEach, describe, expect, it } from 'vitest'
import { THEME } from '../consts'
import { VOROFORCE_MODE } from '../vf/consts'
import {
  selectIsIntroMode,
  selectIsPreviewMode,
  selectIsSelectMode,
  store,
} from './index'

describe('Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    localStorage.clear()
  })

  describe('Theme management', () => {
    it('should update theme and persist to storage', () => {
      const initialTheme = store.getState().theme
      const newTheme = initialTheme === THEME.dark ? THEME.light : THEME.dark

      store.getState().setTheme(newTheme)

      expect(store.getState().theme).toBe(newTheme)

      // Check that it's persisted (settings are now consolidated)
      const persistedSettings = JSON.parse(
        localStorage.getItem('settings') || '{}',
      )
      expect(persistedSettings.theme).toBe(newTheme)
    })
  })

  describe('Intro state', () => {
    it('should update playedIntro and persist to storage', () => {
      store.getState().setPlayedIntro(true)

      expect(store.getState().playedIntro).toBe(true)

      const persistedSettings = JSON.parse(
        localStorage.getItem('settings') || '{}',
      )
      expect(persistedSettings.playedIntro).toBe(true)
    })
  })

  describe('UI state', () => {
    it('should toggle settings modal without persisting', () => {
      const initialState = store.getState().settingsOpen

      store.getState().toggleSettingsOpen()

      expect(store.getState().settingsOpen).toBe(!initialState)

      // UI state should not be persisted
      const persistedSettings = JSON.parse(
        localStorage.getItem('settings') || '{}',
      )
      expect(persistedSettings).not.toHaveProperty('settingsOpen')
    })

    it('should toggle about modal without persisting', () => {
      const initialState = store.getState().aboutOpen

      store.getState().toggleAboutOpen()

      expect(store.getState().aboutOpen).toBe(!initialState)

      // UI state should not be persisted
      const persistedSettings = JSON.parse(
        localStorage.getItem('settings') || '{}',
      )
      expect(persistedSettings).not.toHaveProperty('aboutOpen')
    })
  })

  describe('Device class', () => {
    it('should update deviceClass and persist to storage', () => {
      const deviceClass = 2

      store.getState().setDeviceClass(deviceClass)

      expect(store.getState().deviceClass).toBe(deviceClass)

      const persistedSettings = JSON.parse(
        localStorage.getItem('settings') || '{}',
      )
      expect(persistedSettings.deviceClass).toBe(deviceClass)
    })

    it('should update estimatedDeviceClass without persisting', () => {
      const estimatedClass = 3

      store.getState().setEstimatedDeviceClass(estimatedClass)

      expect(store.getState().estimatedDeviceClass).toBe(estimatedClass)

      // Estimated device class should not be persisted (it's computed at runtime)
      const persistedSettings = JSON.parse(
        localStorage.getItem('settings') || '{}',
      )
      expect(persistedSettings.estimatedDeviceClass).toBeUndefined()
    })
  })

  describe('User config', () => {
    it('should update userConfig and persist to storage', () => {
      const config = { cells: 150, devTools: true }

      store.getState().setUserConfig(config)

      expect(store.getState().userConfig).toEqual(config)

      const persistedSettings = JSON.parse(
        localStorage.getItem('settings') || '{}',
      )
      expect(persistedSettings.userConfig).toEqual(config)
    })
  })

  describe('Mode management', () => {
    it('should update mode and derive boolean flags through selectors', () => {
      const { setMode } = store.getState()

      // Test select mode
      setMode(VOROFORCE_MODE.select)
      let state = store.getState()
      expect(state.mode).toBe(VOROFORCE_MODE.select)
      expect(selectIsSelectMode(state)).toBe(true)
      expect(selectIsPreviewMode(state)).toBe(false)
      expect(selectIsIntroMode(state)).toBe(false)

      // Test preview mode
      setMode(VOROFORCE_MODE.preview)
      state = store.getState()
      expect(state.mode).toBe(VOROFORCE_MODE.preview)
      expect(selectIsSelectMode(state)).toBe(false)
      expect(selectIsPreviewMode(state)).toBe(true)
      expect(selectIsIntroMode(state)).toBe(false)

      // Test intro mode
      setMode(VOROFORCE_MODE.intro)
      state = store.getState()
      expect(state.mode).toBe(VOROFORCE_MODE.intro)
      expect(selectIsSelectMode(state)).toBe(false)
      expect(selectIsPreviewMode(state)).toBe(false)
      expect(selectIsIntroMode(state)).toBe(true)
    })
  })
})
