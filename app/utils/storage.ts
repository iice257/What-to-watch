import type { THEME } from '../consts'
import type { UserConfig, VOROFORCE_PRESET } from '../vf'
import type { CELL_LIMIT, DEVICE_CLASS } from '../vf/consts'

export const STORAGE_KEYS = {
  THEME: 'theme',
  PLAYED_INTRO: 'playedIntro',
  PRESET: 'preset',
  CELL_LIMIT: 'cellLimit',
  DEVICE_CLASS: 'deviceClass',
  ESTIMATED_DEVICE_CLASS: 'estimatedDeviceClass',
  USER_CONFIG: 'userConfig',
} as const

type StorageSchema = {
  [STORAGE_KEYS.THEME]: THEME
  [STORAGE_KEYS.PLAYED_INTRO]: boolean
  [STORAGE_KEYS.PRESET]: VOROFORCE_PRESET
  [STORAGE_KEYS.CELL_LIMIT]: CELL_LIMIT
  [STORAGE_KEYS.DEVICE_CLASS]: DEVICE_CLASS
  [STORAGE_KEYS.ESTIMATED_DEVICE_CLASS]: DEVICE_CLASS
  [STORAGE_KEYS.USER_CONFIG]: UserConfig
}

type StorageKey = keyof StorageSchema

export const getStorageItem = <K extends StorageKey>(
  key: K,
): StorageSchema[K] | null => {
  try {
    const value = localStorage.getItem(key)
    if (value === null) return null

    // Handle different value types
    switch (key) {
      case STORAGE_KEYS.PLAYED_INTRO:
        return Boolean(value) as StorageSchema[K]

      case STORAGE_KEYS.CELL_LIMIT:
      case STORAGE_KEYS.DEVICE_CLASS:
      case STORAGE_KEYS.ESTIMATED_DEVICE_CLASS:
        return (value ? Number.parseInt(value, 10) : null) as StorageSchema[K]

      case STORAGE_KEYS.USER_CONFIG:
        return (value ? JSON.parse(value) : {}) as StorageSchema[K]
      default:
        return value as StorageSchema[K]
    }
  } catch (error) {
    console.warn(
      `Failed to get item from localStorage for key "${key}":`,
      error,
    )
    return null
  }
}

export const setStorageItem = <K extends StorageKey>(
  key: K,
  value: StorageSchema[K],
): void => {
  try {
    // Handle different value types
    let stringValue: string

    switch (key) {
      case STORAGE_KEYS.PLAYED_INTRO:
        stringValue = value ? String(value) : ''
        break

      case STORAGE_KEYS.CELL_LIMIT:
      case STORAGE_KEYS.DEVICE_CLASS:
      case STORAGE_KEYS.ESTIMATED_DEVICE_CLASS:
        stringValue = String(value)
        break

      case STORAGE_KEYS.USER_CONFIG:
        stringValue = JSON.stringify(value)
        break
      default:
        stringValue = String(value)
        break
    }

    localStorage.setItem(key, stringValue)
  } catch (error) {
    console.warn(`Failed to set item in localStorage for key "${key}":`, error)
  }
}

export const removeStorageItem = (key: StorageKey): void => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(
      `Failed to remove item from localStorage for key "${key}":`,
      error,
    )
  }
}

export const clearStorage = (): void => {
  try {
    // Only clear our app's keys, not the entire localStorage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.warn('Failed to clear localStorage:', error)
  }
}

export const hasStorageItem = (key: StorageKey): boolean => {
  return localStorage.getItem(key) !== null
}

export type { StorageSchema, StorageKey }
