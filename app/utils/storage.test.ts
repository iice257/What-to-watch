import { beforeEach, describe, expect, it } from 'vitest'
import { getStorageItem, STORAGE_KEYS } from './storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('parses the persisted intro flag without treating "false" as true', () => {
    localStorage.setItem(STORAGE_KEYS.PLAYED_INTRO, 'false')

    expect(getStorageItem(STORAGE_KEYS.PLAYED_INTRO)).toBe(false)
  })
})
