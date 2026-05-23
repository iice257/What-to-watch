import type { VoroforceCell } from '../types'

export type FilmData = Record<string, string | number>
export type FilmBatch = FilmData[]
export type FilmBatches = Map<number, FilmBatch>
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
    this.poster = String(data.poster_path)
    this.backdrop = String(data.backdrop_path)
  }
}

const loadCellFilmBatch = async (batchIndex: number) => {
  const filmInfoBaseUrl = import.meta.env.VITE_FILM_INFO_BASE_URL ?? '/json'
  const url = `${filmInfoBaseUrl}/${batchIndex}.json`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.log('batchIndex', batchIndex)
    console.error('Error loading JSON:', error)
  }
}

export const getCellFilm = async (
  cell: VoroforceCell,
  filmBatches: FilmBatches,
) => {
  if (!cell) return
  const metadataSubgrid = Number.isFinite(cell.subgrid) ? cell.subgrid : 0
  const metadataIndex = Number.isFinite(cell.subgridIndex)
    ? cell.subgridIndex
    : cell.index
  let filmBatch = filmBatches.get(metadataSubgrid)
  if (!filmBatch) {
    filmBatch = await loadCellFilmBatch(metadataSubgrid)
    filmBatches.set(metadataSubgrid, filmBatch ?? [])
  }

  const filmData = filmBatch?.[metadataIndex % filmBatch.length]

  return filmData ? new Film(filmData) : undefined
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
