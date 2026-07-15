import { beforeEach, describe, expect, it } from 'vitest'
import { THEME } from '../consts'
import { CELL_LIMIT, DEVICE_CLASS, VOROFORCE_PRESET } from '../vf/consts'
import {
  type PersistentSettings,
  getPersistentSettings,
  hasExistingSettings,
  resetPersistentSettings,
  setPersistentSettings,
  updatePersistentSetting,
} from './settings'

describe('Settings Utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getPersistentSettings', () => {
    it('should return default settings when no existing data', () => {
      const settings = getPersistentSettings()

      expect(settings).toEqual({
        version: 1,
        theme: THEME.dark,
        playedIntro: true,
        preset: VOROFORCE_PRESET.minimal,
        cellLimit: CELL_LIMIT.xs,
        deviceClass: DEVICE_CLASS.low,
        userConfig: {},
      })
    })

    it('should return saved settings when they exist', () => {
      const testSettings: PersistentSettings = {
        version: 1,
        theme: THEME.light,
        playedIntro: true,
        preset: VOROFORCE_PRESET.minimal,
        userConfig: { cells: 100 },
      }

      localStorage.setItem('settings', JSON.stringify(testSettings))

      const settings = getPersistentSettings()
      expect(settings).toEqual({
        ...testSettings,
        cellLimit: CELL_LIMIT.xs,
        deviceClass: DEVICE_CLASS.low,
      })
    })

    it('should migrate from legacy individual keys', () => {
      // Set up legacy keys
      localStorage.setItem('theme', 'light')
      localStorage.setItem('playedIntro', 'true')
      localStorage.setItem('preset', VOROFORCE_PRESET.chaos)
      localStorage.setItem('userConfig', '{"legacy": true}')

      const settings = getPersistentSettings()

      expect(settings).toEqual({
        version: 1,
        theme: THEME.light,
        playedIntro: true,
        preset: VOROFORCE_PRESET.chaos,
        cellLimit: CELL_LIMIT.xs,
        deviceClass: DEVICE_CLASS.low,
        userConfig: { legacy: true },
      })

      // Should have cleaned up legacy keys
      expect(localStorage.getItem('theme')).toBeNull()
      expect(localStorage.getItem('playedIntro')).toBeNull()

      // Should have saved consolidated settings
      expect(localStorage.getItem('settings')).toBeTruthy()
    })

    it('preserves valid saved performance preferences', () => {
      const testSettings: PersistentSettings = {
        version: 1,
        theme: THEME.dark,
        playedIntro: false,
        preset: VOROFORCE_PRESET.chaos,
        cellLimit: CELL_LIMIT.md,
        userConfig: {},
      }

      localStorage.setItem('settings', JSON.stringify(testSettings))

      expect(getPersistentSettings()).toMatchObject(testSettings)
    })
  })

  describe('setPersistentSettings', () => {
    it('should save settings to localStorage', () => {
      const settings: PersistentSettings = {
        version: 1,
        theme: THEME.dark,
        playedIntro: true,
        userConfig: { devTools: true },
      }

      setPersistentSettings(settings)

      const saved = JSON.parse(localStorage.getItem('settings') || '{}')
      expect(saved).toEqual(settings)
    })
  })

  describe('updatePersistentSetting', () => {
    it('should update a single setting and return updated object', () => {
      const initial: PersistentSettings = {
        version: 1,
        theme: THEME.dark,
        playedIntro: false,
        userConfig: {},
      }

      setPersistentSettings(initial)

      const updated = updatePersistentSetting('theme', THEME.light)

      expect(updated.theme).toBe(THEME.light)
      expect(updated.playedIntro).toBe(false) // Should preserve other values

      // Should be persisted
      const persisted = getPersistentSettings()
      expect(persisted.theme).toBe(THEME.light)
    })
  })

  describe('resetPersistentSettings', () => {
    it('should reset to default settings', () => {
      const custom: PersistentSettings = {
        version: 1,
        theme: THEME.light,
        playedIntro: true,
        preset: VOROFORCE_PRESET.chaos,
        userConfig: { devTools: true },
      }

      setPersistentSettings(custom)

      const reset = resetPersistentSettings()

      expect(reset).toEqual({
        version: 1,
        theme: THEME.dark,
        playedIntro: true,
        preset: VOROFORCE_PRESET.minimal,
        cellLimit: CELL_LIMIT.xs,
        deviceClass: DEVICE_CLASS.low,
        userConfig: {},
      })

      // Should be persisted
      const persisted = getPersistentSettings()
      expect(persisted).toEqual(reset)
    })
  })

  describe('hasExistingSettings', () => {
    it('should return false when no settings exist', () => {
      expect(hasExistingSettings()).toBe(false)
    })

    it('should return true when settings exist', () => {
      localStorage.setItem('settings', '{}')
      expect(hasExistingSettings()).toBe(true)
    })
  })
})
