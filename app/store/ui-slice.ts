import type { DialogProps } from 'vaul'
import type { StateCreator } from 'zustand'
import type { THEME } from '../consts'
import {
  getPersistentSettings,
  updatePersistentSetting,
} from '../utils/settings'

export interface UiSlice {
  theme: THEME
  setTheme: (theme: THEME) => void
  settingsOpen: boolean
  setSettingsOpen: (settingsOpen: boolean) => void
  toggleSettingsOpen: () => void
  aboutOpen: boolean
  setAboutOpen: (aboutOpen: boolean) => void
  toggleAboutOpen: () => void
  favoritesOpen: boolean
  setFavoritesOpen: (favoritesOpen: boolean) => void
  toggleFavoritesOpen: () => void
  addCustomLinkTypeOpen: boolean | DialogProps['direction']
  setAddCustomLinkTypeOpen: (open: boolean | DialogProps['direction']) => void
  toggleAddCustomLinkTypeOpen: () => void
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (
  set,
  get,
) => {
  const persistentSettings = getPersistentSettings()

  return {
    theme: persistentSettings.theme,
    setTheme: (theme: THEME) => {
      updatePersistentSetting('theme', theme)
      set({ theme })
    },
    settingsOpen: false,
    setSettingsOpen: (settingsOpen: boolean) => {
      set({ settingsOpen })
    },
    toggleSettingsOpen: () => {
      set({ settingsOpen: !get().settingsOpen })
    },
    aboutOpen: false,
    setAboutOpen: (aboutOpen: boolean) => {
      set({ aboutOpen })
    },
    toggleAboutOpen: () => {
      set({ aboutOpen: !get().aboutOpen })
    },
    favoritesOpen: false,
    setFavoritesOpen: (favoritesOpen: boolean) => {
      set({ favoritesOpen })
    },
    toggleFavoritesOpen: () => {
      set({ favoritesOpen: !get().favoritesOpen })
    },
    addCustomLinkTypeOpen: false,
    setAddCustomLinkTypeOpen: (
      addCustomLinkTypeOpen: boolean | DialogProps['direction'],
    ) => {
      set({ addCustomLinkTypeOpen })
    },
    toggleAddCustomLinkTypeOpen: () => {
      set({
        addCustomLinkTypeOpen: !get().addCustomLinkTypeOpen,
      })
    },
  }
}
