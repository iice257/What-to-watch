import { MOVIE_FILTER_INDEX } from './movie-filter-index'

export type MovieLengthFilter = 'short' | 'feature' | 'long'

export type MovieFilters = {
  genre?: string
  yearFrom?: number
  yearTo?: number
  length?: MovieLengthFilter
}

const matchesLength = (runtime: number, length?: MovieLengthFilter) => {
  if (!length) return true
  if (!runtime) return false
  if (length === 'short') return runtime < 90
  if (length === 'long') return runtime >= 150
  return runtime >= 90 && runtime < 150
}

export const getFilteredMovieIds = (filters?: MovieFilters) => {
  if (
    !filters?.genre &&
    !filters?.yearFrom &&
    !filters?.yearTo &&
    !filters?.length
  ) {
    return undefined
  }

  const yearFrom = filters.yearFrom ?? Number.NEGATIVE_INFINITY
  const yearTo = filters.yearTo ?? Number.POSITIVE_INFINITY
  const ids = MOVIE_FILTER_INDEX.filter((entry) => {
    if (filters.genre && !entry.genres.includes(filters.genre)) return false
    if (entry.year && (entry.year < yearFrom || entry.year > yearTo))
      return false
    return matchesLength(entry.runtime, filters.length)
  }).map((entry) => entry.tmdbId)

  return ids.length ? ids : undefined
}
