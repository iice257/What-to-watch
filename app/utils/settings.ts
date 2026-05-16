import type { THEME } from '../consts'
import type { UserConfig, VOROFORCE_PRESET } from '../vf'
import type { CELL_LIMIT, DEVICE_CLASS } from '../vf/consts'

// Version for migration tracking
const SETTINGS_VERSION = 1

// Persistent user preferences that should survive across sessions
export type PersistentSettings = {
  version: number
  theme: THEME
  playedIntro: boolean
  preset?: VOROFORCE_PRESET
  cellLimit?: CELL_LIMIT
  deviceClass?: DEVICE_CLASS
  userConfig: UserConfig
}

// Storage key for the consolidated settings
const SETTINGS_STORAGE_KEY = 'settings'

// Legacy settings type for migration
type LegacySettings = {
  theme?: string
  playedIntro?: boolean
  preset?: string
  cellLimit?: number
  deviceClass?: number
  userConfig?: Record<string, unknown>
}

// Migration functions for each version
const migrations: Record<
  number,
  (oldSettings: LegacySettings) => PersistentSettings
> = {
  // Migration from legacy individual keys to consolidated settings
  1: (oldSettings: LegacySettings): PersistentSettings => ({
    version: 1,
    theme: (oldSettings?.theme as THEME) ?? 'dark',
    playedIntro: oldSettings?.playedIntro ?? false,
    preset: oldSettings?.preset as VOROFORCE_PRESET,
    cellLimit: oldSettings?.cellLimit as CELL_LIMIT,
    deviceClass: oldSettings?.deviceClass as DEVICE_CLASS,
    userConfig: oldSettings?.userConfig ?? {},
  }),
}

// Get persistent settings with migration support
export const getPersistentSettings = (): PersistentSettings => {
  try {
    // Try to get consolidated settings first
    const consolidated = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (consolidated) {
      const parsed = JSON.parse(consolidated) as PersistentSettings

      // Check if migration is needed
      if (parsed.version < SETTINGS_VERSION) {
        return migrateSettings(parsed)
      }

      return parsed
    }

    // If no consolidated settings, try to migrate from legacy keys
    const legacy = {
      theme: localStorage.getItem('theme'),
      playedIntro: localStorage.getItem('playedIntro'),
      preset: localStorage.getItem('preset'),
      cellLimit: localStorage.getItem('cellLimit'),
      deviceClass: localStorage.getItem('deviceClass'),
      userConfig: localStorage.getItem('userConfig'),
    }

    // Check if any legacy keys exist
    const hasLegacyData = Object.values(legacy).some((val) => val !== null)
    if (hasLegacyData) {
      // Parse legacy values
      const parsedLegacy = {
        theme: legacy.theme || 'dark',
        playedIntro: legacy.playedIntro === 'true',
        preset: legacy.preset || undefined,
        cellLimit: legacy.cellLimit
          ? Number.parseInt(legacy.cellLimit, 10)
          : undefined,
        deviceClass: legacy.deviceClass
          ? Number.parseInt(legacy.deviceClass, 10)
          : undefined,
        userConfig: legacy.userConfig ? JSON.parse(legacy.userConfig) : {},
      }

      const migrated = migrations[1](parsedLegacy)
      setPersistentSettings(migrated)

      // Clean up legacy keys
      cleanupLegacyKeys()

      return migrated
    }

    // Return defaults if no existing data
    return getDefaultSettings()
  } catch (error) {
    console.warn('Failed to get persistent settings, using defaults:', error)
    return getDefaultSettings()
  }
}

// Save persistent settings
export const setPersistentSettings = (settings: PersistentSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('Failed to save persistent settings:', error)
  }
}

// Update a specific setting
export const updatePersistentSetting = <
  K extends keyof Omit<PersistentSettings, 'version'>,
>(
  key: K,
  value: PersistentSettings[K],
): PersistentSettings => {
  const current = getPersistentSettings()
  const updated = { ...current, [key]: value }
  setPersistentSettings(updated)
  return updated
}

// Migrate settings to current version
const migrateSettings = (
  oldSettings: PersistentSettings,
): PersistentSettings => {
  let current = { ...oldSettings }

  // Apply migrations in sequence
  for (
    let version = current.version + 1;
    version <= SETTINGS_VERSION;
    version++
  ) {
    if (migrations[version]) {
      current = migrations[version](current)
    }
  }

  current.version = SETTINGS_VERSION
  setPersistentSettings(current)
  return current
}

// Get default settings
const getDefaultSettings = (): PersistentSettings => ({
  version: SETTINGS_VERSION,
  theme: 'dark' as THEME,
  playedIntro: false,
  userConfig: {},
})

// Clean up legacy storage keys after migration
const cleanupLegacyKeys = (): void => {
  const legacyKeys = [
    'theme',
    'playedIntro',
    'preset',
    'cellLimit',
    'deviceClass',
    'estimatedDeviceClass',
    'userConfig',
  ]

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`Failed to cleanup legacy key "${key}":`, error)
    }
  })
}

// Reset all settings to defaults
export const resetPersistentSettings = (): PersistentSettings => {
  const defaults = getDefaultSettings()
  setPersistentSettings(defaults)
  return defaults
}

// Check if settings exist (for first-time user detection)
export const hasExistingSettings = (): boolean => {
  return localStorage.getItem(SETTINGS_STORAGE_KEY) !== null
}
