import type { VoroforceCell } from '../types'

export type FilmData = Record<string, string | number>
export type FilmBatch = FilmData[]
export type FilmBatches = Map<number, FilmBatch>
export const FILM_BATCH_SIZE = 216
const FILM_BATCH_COUNT = 5
const normalizeBatchIndex = (batchIndex: number) =>
  ((batchIndex % FILM_BATCH_COUNT) + FILM_BATCH_COUNT) % FILM_BATCH_COUNT
const englishLanguageCountries = [
  'Australia',
  'Canada',
  'Ireland',
  'New Zealand',
  'United Kingdom',
  'United States',
]
const isAscii = (value: string) =>
  [...value].every((character) => character.charCodeAt(0) <= 127)
const isEnglishLikelyFilmData = (filmData: FilmData) => {
  const title = String(filmData.title ?? '')
  const countries = String(filmData.production_countries ?? '')
  return (
    title.length > 0 &&
    isAscii(title) &&
    englishLanguageCountries.some((country) => countries.includes(country))
  )
}
const getDisplayFilmData = (filmBatch: FilmBatch, index: number) => {
  if (!filmBatch.length) return
  const filmData = filmBatch[index % filmBatch.length]
  if (!filmData || isEnglishLikelyFilmData(filmData)) return filmData

  for (let offset = 1; offset < filmBatch.length; offset++) {
    const candidate = filmBatch[(index + offset) % filmBatch.length]
    if (candidate && isEnglishLikelyFilmData(candidate)) return candidate
  }

  return filmData
}
const loadFallbackFilmBatch = async (filmBatches: FilmBatches) => {
  let fallbackBatch = filmBatches.get(0)
  if (!fallbackBatch) {
    fallbackBatch = await loadCellFilmBatch(0)
    filmBatches.set(0, fallbackBatch ?? [])
  }
  return fallbackBatch
}
export type DiscoveryTag =
  | 'crowd-pleaser'
  | 'hidden-gem'
  | 'recent-pick'
  | 'throwback'
  | 'comfort-watch'
  | 'high-energy'
  | 'slow-burn'
  | 'visually-striking'

export interface SimilarFilmMatch {
  film: Film
  score: number
  reasons: string[]
}

export interface FilmLocation {
  subgrid: number
  subgridIndex: number
}

export class Film {
  tmdbId: number
  imdbId?: string
  title: string
  tagline?: string
  overview?: string
  genres?: string[]
  year: number
  rating: number
  popularity: number
  runtime?: number
  poster: string
  backdrop: string

  constructor(data: FilmData) {
    this.tmdbId = Number(data.id)
    this.imdbId = data.imdb_id ? String(data.imdb_id) : undefined
    this.title = String(data.title)
    this.tagline = data.tagline ? String(data.tagline) : undefined
    this.overview = data.overview ? String(data.overview) : undefined
    this.genres = data.genres
      ? String(data.genres)
          .split(',')
          .map((genre) => genre.trim())
          .filter(Boolean)
      : undefined
    this.year = Number(data.release_year)
    this.rating = Number(data.vote_average) * 10
    this.popularity = Number(data.popularity)
    const runtime = Number(data.runtime_minutes)
    this.runtime = Number.isFinite(runtime) && runtime > 0 ? runtime : undefined
    this.poster = String(data.poster_path)
    this.backdrop = String(data.backdrop_path)
  }
}

const loadCellFilmBatch = async (batchIndex: number) => {
  const filmInfoBaseUrl = import.meta.env.VITE_FILM_INFO_BASE_URL ?? '/json'
  const normalizedBatchIndex = normalizeBatchIndex(batchIndex)
  const url = `${filmInfoBaseUrl}/${normalizedBatchIndex}.json`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.log('batchIndex', batchIndex, 'normalized', normalizedBatchIndex)
    console.error('Error loading JSON:', error)
  }
}

export const getCellFilm = async (
  cell: VoroforceCell,
  filmBatches: FilmBatches,
) => {
  if (!cell) return
  const metadataSubgrid = normalizeBatchIndex(
    Number.isFinite(cell.subgrid) ? cell.subgrid : 0,
  )
  const metadataIndex = Number.isFinite(cell.subgridIndex)
    ? cell.subgridIndex
    : cell.index
  let filmBatch = filmBatches.get(metadataSubgrid)
  if (!filmBatch) {
    filmBatch = await loadCellFilmBatch(metadataSubgrid)
    filmBatches.set(metadataSubgrid, filmBatch ?? [])
  }

  const filmData = filmBatch?.length
    ? getDisplayFilmData(filmBatch, metadataIndex)
    : undefined
  const displayFilmData =
    filmData && isEnglishLikelyFilmData(filmData)
      ? filmData
      : (getDisplayFilmData(
          (await loadFallbackFilmBatch(filmBatches)) ?? [],
          metadataIndex,
        ) ?? filmData)

  return displayFilmData ? new Film(displayFilmData) : undefined
}

export const findFilmLocation = (
  film: Film,
  filmBatches: FilmBatches,
): FilmLocation | undefined => {
  for (const [subgrid, filmBatch] of filmBatches) {
    const subgridIndex = filmBatch.findIndex(
      (filmData) => Number(filmData.id) === film.tmdbId,
    )
    if (subgridIndex !== -1) return { subgrid, subgridIndex }
  }
}

export const assignFilmToCell = (
  cell: VoroforceCell,
  location: FilmLocation,
) => {
  const metadataCellId =
    location.subgrid * FILM_BATCH_SIZE + location.subgridIndex
  cell.id = metadataCellId
  cell.subgrid = location.subgrid
  cell.subgridIndex = location.subgridIndex
  cell.targetMediaVersion = Math.max(cell.targetMediaVersion ?? 0, 2)
}

const getGenreOverlapScore = (
  sourceGenres?: string[],
  targetGenres?: string[],
) => {
  if (!sourceGenres?.length || !targetGenres?.length) return 0

  const targetSet = new Set(targetGenres)
  const overlap = sourceGenres.filter((genre) => targetSet.has(genre)).length
  return overlap / Math.max(sourceGenres.length, targetGenres.length)
}

const normalizeDistance = (distance: number, maxDistance: number) =>
  Math.max(0, 1 - Math.min(distance, maxDistance) / maxDistance)

const getSharedGenres = (sourceGenres?: string[], targetGenres?: string[]) => {
  if (!sourceGenres?.length || !targetGenres?.length) return []

  const targetSet = new Set(targetGenres)
  return sourceGenres.filter((genre) => targetSet.has(genre))
}

export const getDiscoveryTags = (film: Film): DiscoveryTag[] => {
  const genres = new Set(film.genres ?? [])
  const tags: DiscoveryTag[] = []

  if (film.rating >= 78 && film.popularity >= 45) tags.push('crowd-pleaser')
  if (film.rating >= 74 && film.popularity < 35) tags.push('hidden-gem')
  if (film.year >= new Date().getFullYear() - 3) tags.push('recent-pick')
  if (film.year > 0 && film.year < 2000) tags.push('throwback')
  if (genres.has('Animation') || genres.has('Family') || genres.has('Comedy')) {
    tags.push('comfort-watch')
  }
  if (
    genres.has('Action') ||
    genres.has('Adventure') ||
    genres.has('Thriller')
  ) {
    tags.push('high-energy')
  }
  if (genres.has('Drama') || genres.has('Mystery')) tags.push('slow-burn')
  if (genres.has('Fantasy') || genres.has('Science Fiction')) {
    tags.push('visually-striking')
  }

  return tags
}

export const getSimilarityReasons = (source: Film, candidate: Film) => {
  const reasons: string[] = []
  const sharedGenres = getSharedGenres(source.genres, candidate.genres)

  if (sharedGenres.length) {
    reasons.push(
      sharedGenres.length === 1
        ? `Shared ${sharedGenres[0]} mood`
        : `Shared ${sharedGenres.slice(0, 2).join(' and ')} DNA`,
    )
  }
  if (
    source.year &&
    candidate.year &&
    Math.abs(source.year - candidate.year) <= 5
  ) {
    reasons.push('Same era')
  }
  if (Math.abs(source.rating - candidate.rating) <= 8) {
    reasons.push('Similar TMDB score')
  }
  if (getDiscoveryTags(candidate).includes('hidden-gem')) {
    reasons.push('Hidden gem')
  }

  return reasons.slice(0, 3)
}

export const scoreSimilarFilm = (source: Film, candidate: Film) => {
  if (source.tmdbId === candidate.tmdbId) return Number.NEGATIVE_INFINITY

  const genreScore = getGenreOverlapScore(source.genres, candidate.genres)
  const yearScore =
    source.year && candidate.year
      ? normalizeDistance(Math.abs(source.year - candidate.year), 35)
      : 0
  const ratingScore = normalizeDistance(
    Math.abs(source.rating - candidate.rating),
    100,
  )
  const popularityScore = normalizeDistance(
    Math.abs(source.popularity - candidate.popularity),
    Math.max(source.popularity, candidate.popularity, 1),
  )

  return (
    genreScore * 0.52 +
    yearScore * 0.18 +
    ratingScore * 0.2 +
    popularityScore * 0.1
  )
}

export const getSimilarFilms = (
  source: Film,
  filmBatches: FilmBatches,
  limit = 6,
): SimilarFilmMatch[] => {
  const candidates = [...filmBatches.values()]
    .flat()
    .filter(isEnglishLikelyFilmData)
    .map((filmData) => new Film(filmData))

  return candidates
    .map((film) => {
      const score = scoreSimilarFilm(source, film)

      return {
        film,
        score,
        reasons: getSimilarityReasons(source, film),
      }
    })
    .filter(({ score }) => Number.isFinite(score) && score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
