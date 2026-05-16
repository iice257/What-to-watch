import type { VoroforceCell } from '../types'

export type FilmData = Record<string, string | number>
export type FilmBatch = FilmData[]
export type FilmBatches = Map<number, FilmBatch>

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
    this.genres = data.genres ? String(data.genres).split(', ') : undefined
    this.year = Number(data.release_year)
    this.rating = Number(data.vote_average) * 10
    this.popularity = Number(data.popularity)
    this.poster = String(data.poster_path)
    this.backdrop = String(data.backdrop_path)
  }
}

const loadCellFilmBatch = async (batchIndex: number) => {
  const url = `${import.meta.env.VITE_FILM_INFO_BASE_URL}/${batchIndex}.json`
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
  let filmBatch = filmBatches.get(cell.subgrid)
  if (!filmBatch) {
    filmBatch = await loadCellFilmBatch(cell.subgrid)
    filmBatches.set(cell.subgrid, filmBatch ?? [])
  }

  return filmBatch?.[cell.subgridIndex]
    ? new Film(filmBatch[cell.subgridIndex])
    : undefined
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
) => {
  const candidates = [...filmBatches.values()]
    .flat()
    .map((filmData) => new Film(filmData))

  return candidates
    .map((film) => ({
      film,
      score: scoreSimilarFilm(source, film),
    }))
    .filter(({ score }) => Number.isFinite(score) && score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
