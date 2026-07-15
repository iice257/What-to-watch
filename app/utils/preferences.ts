import type { CustomMovieLink } from '../domain/custom-links'

export type SavedMovie = {
  tmdbId: number
  title: string
  year?: number
  imdbId?: string
  poster?: string
}

export type GalleryPreferences = {
  version: 1
  favorites: Record<number, SavedMovie>
  customLinks: CustomMovieLink[]
  reducedMotion: boolean
}

const STORAGE_KEY = 'what-to-watch:preferences'

const defaults = (): GalleryPreferences => ({
  version: 1,
  favorites: {},
  customLinks: [],
  reducedMotion: false,
})

export const loadGalleryPreferences = (): GalleryPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<GalleryPreferences>
    return {
      ...defaults(),
      ...parsed,
      version: 1,
      favorites: parsed.favorites ?? {},
      customLinks: parsed.customLinks ?? [],
    }
  } catch {
    return defaults()
  }
}

export const saveGalleryPreferences = (preferences: GalleryPreferences) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
