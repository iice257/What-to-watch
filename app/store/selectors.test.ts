import { UAParser } from 'ua-parser-js'
import { describe, expect, it } from 'vitest'
import { THEME } from '../consts'
import type { ConfigUniforms, VoroforceInstance } from '../vf'
import { VOROFORCE_MODE, VOROFORCE_PRESET } from '../vf/consts'
import type { StoreState } from './index'
import {
  selectAnyModalOpen,
  selectAppReadiness,
  selectIsIntroMode,
  selectIsPreviewMode,
  selectIsSelectMode,
  selectModalsOpen,
  selectModeFlags,
  selectTheme,
  selectVoroforceReady,
} from './selectors'

// Mock state factory
const createMockState = (overrides: Partial<StoreState> = {}): StoreState => ({
  // UI Slice defaults
  theme: THEME.dark,
  setTheme: () => {},
  settingsOpen: false,
  setSettingsOpen: () => {},
  toggleSettingsOpen: () => {},
  aboutOpen: false,
  setAboutOpen: () => {},
  toggleAboutOpen: () => {},
  favoritesOpen: false,
  setFavoritesOpen: () => {},
  toggleFavoritesOpen: () => {},
  addCustomLinkTypeOpen: false,
  setAddCustomLinkTypeOpen: () => {},
  toggleAddCustomLinkTypeOpen: () => {},

  // Voroforce Slice defaults
  ua: new UAParser(),
  setContainer: () => {},
  setVoroforce: () => {},
  setConfig: () => {},
  voroforceMediaPreloaded: false,
  setVoroforceMediaPreloaded: () => {},
  mode: VOROFORCE_MODE.intro,
  setMode: () => {},
  exitSelectMode: () => {},
  voroforceDevSceneEnabled: false,
  setVoroforceDevSceneEnabled: () => {},
  playedIntro: false,
  setPlayedIntro: () => {},
  setPreset: () => {},
  setCellLimit: () => {},
  setDeviceClass: () => {},
  setEstimatedDeviceClass: () => {},
  setUserConfig: () => {},
  userConfig: { cells: 100, devTools: false },
  configUniforms: {
    main: new Map() as ConfigUniforms,
    post: new Map() as ConfigUniforms,
    transitioning: new Map() as ConfigUniforms,
  },
  setPerformanceMonitor: () => {},

  // FilmData Slice defaults
  setFilm: () => {},
  filmBatches: new Map(),

  // Apply overrides
  ...overrides,
})

describe('Store Selectors', () => {
  describe('Mode selectors', () => {
    it('should correctly identify select mode', () => {
      const state = createMockState({ mode: VOROFORCE_MODE.select })

      expect(selectIsSelectMode(state)).toBe(true)
      expect(selectIsPreviewMode(state)).toBe(false)
      expect(selectIsIntroMode(state)).toBe(false)
    })

    it('should correctly identify preview mode', () => {
      const state = createMockState({ mode: VOROFORCE_MODE.preview })

      expect(selectIsSelectMode(state)).toBe(false)
      expect(selectIsPreviewMode(state)).toBe(true)
      expect(selectIsIntroMode(state)).toBe(false)
    })

    it('should correctly identify intro mode', () => {
      const state = createMockState({ mode: VOROFORCE_MODE.intro })

      expect(selectIsSelectMode(state)).toBe(false)
      expect(selectIsPreviewMode(state)).toBe(false)
      expect(selectIsIntroMode(state)).toBe(true)
    })

    it('should return memoized mode flags', () => {
      const state = createMockState({ mode: VOROFORCE_MODE.select })
      const flags1 = selectModeFlags(state)
      const flags2 = selectModeFlags(state)

      // Should return the same object reference (memoized)
      expect(flags1).toBe(flags2)
      expect(flags1.isSelectMode).toBe(true)
      expect(flags1.isPreviewMode).toBe(false)
      expect(flags1.isIntroMode).toBe(false)
    })
  })

  describe('UI selectors', () => {
    it('should select theme', () => {
      const state = createMockState({ theme: THEME.light })
      expect(selectTheme(state)).toBe(THEME.light)
    })

    it('should select modal states', () => {
      const state = createMockState({
        settingsOpen: true,
        aboutOpen: false,
        favoritesOpen: true,
        addCustomLinkTypeOpen: 'left',
      })

      const modals = selectModalsOpen(state)
      expect(modals.settings).toBe(true)
      expect(modals.about).toBe(false)
      expect(modals.favorites).toBe(true)
      expect(modals.addCustomLinkType).toBe('left')
    })

    it('should detect if any modal is open', () => {
      const stateNoModals = createMockState()
      expect(selectAnyModalOpen(stateNoModals)).toBe(false)

      const stateWithModal = createMockState({ settingsOpen: true })
      expect(selectAnyModalOpen(stateWithModal)).toBe(true)

      const stateWithCustomLink = createMockState({
        addCustomLinkTypeOpen: 'right',
      })
      expect(selectAnyModalOpen(stateWithCustomLink)).toBe(true)
    })
  })

  describe('Engine selectors', () => {
    it('should detect voroforce readiness', () => {
      const stateNotReady = createMockState()
      expect(selectVoroforceReady(stateNotReady)).toBe(false)

      const stateWithVoroforce = createMockState({
        voroforce: {} as VoroforceInstance,
        voroforceMediaPreloaded: false,
      })
      expect(selectVoroforceReady(stateWithVoroforce)).toBe(false)

      const stateReady = createMockState({
        voroforce: {} as VoroforceInstance,
        voroforceMediaPreloaded: true,
      })
      expect(selectVoroforceReady(stateReady)).toBe(true)
    })

    it('should select app readiness', () => {
      const state = createMockState({
        voroforce: {} as VoroforceInstance,
        voroforceMediaPreloaded: true,
        playedIntro: true,
        mode: VOROFORCE_MODE.select,
        preset: VOROFORCE_PRESET.depth,
      })

      const readiness = selectAppReadiness(state)
      expect(readiness.voroforceReady).toBe(true)
      expect(readiness.playedIntro).toBe(true)
      expect(readiness.mode).toBe(VOROFORCE_MODE.select)
      expect(readiness.isReady).toBe(true)
    })
  })

  describe('Memoized selectors', () => {
    it('should cache mode flags for performance', () => {
      const state1 = createMockState({ mode: VOROFORCE_MODE.select })
      const state2 = createMockState({ mode: VOROFORCE_MODE.select })

      const flags1 = selectModeFlags(state1)
      const flags2 = selectModeFlags(state2)

      // Should return the same cached object for same mode
      expect(flags1).toBe(flags2)
      expect(flags1.isSelectMode).toBe(true)
    })

    it('should return different cached objects for different modes', () => {
      const selectState = createMockState({ mode: VOROFORCE_MODE.select })
      const previewState = createMockState({ mode: VOROFORCE_MODE.preview })

      const selectFlags = selectModeFlags(selectState)
      const previewFlags = selectModeFlags(previewState)

      expect(selectFlags).not.toBe(previewFlags)
      expect(selectFlags.isSelectMode).toBe(true)
      expect(previewFlags.isPreviewMode).toBe(true)
    })
  })
})
