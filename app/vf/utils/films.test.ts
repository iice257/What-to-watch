import { describe, expect, it } from 'vitest'
import {
  Film,
  type FilmData,
  assignFilmToCell,
  findFilmLocation,
  getCellFilm,
  getDiscoveryTags,
  getSimilarFilms,
  getSimilarityReasons,
  scoreSimilarFilm,
} from './films'

const filmData = (overrides: Partial<FilmData>): FilmData => ({
  id: 1,
  imdb_id: 'tt0000001',
  title: 'Source',
  tagline: '',
  overview: '',
  genres: 'Drama, Thriller',
  release_year: 2000,
  vote_average: 8,
  popularity: 50,
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  production_countries: 'United States of America',
  ...overrides,
})

describe('film similarity', () => {
  it('normalizes comma-separated genres with inconsistent spacing', () => {
    const film = new Film(
      filmData({
        genres: 'Drama,Thriller, Science Fiction',
      }),
    )

    expect(film.genres).toEqual(['Drama', 'Thriller', 'Science Fiction'])
  })

  it('scores films with shared genres higher than unrelated films', () => {
    const source = new Film(filmData({ id: 1, title: 'Source' }))
    const similar = new Film(
      filmData({
        id: 2,
        title: 'Similar',
        genres: 'Drama, Thriller',
        release_year: 2001,
      }),
    )
    const unrelated = new Film(
      filmData({
        id: 3,
        title: 'Unrelated',
        genres: 'Animation, Family',
        release_year: 1980,
      }),
    )

    expect(scoreSimilarFilm(source, similar)).toBeGreaterThan(
      scoreSimilarFilm(source, unrelated),
    )
  })

  it('returns highest scoring candidates first', () => {
    const source = new Film(filmData({ id: 1, title: 'Source' }))
    const batches = new Map([
      [
        0,
        [
          filmData({ id: 1, title: 'Source' }),
          filmData({ id: 2, title: 'Closest', release_year: 2001 }),
          filmData({
            id: 3,
            title: 'Further',
            genres: 'Comedy',
            release_year: 1970,
          }),
        ],
      ],
    ])

    const [first] = getSimilarFilms(source, batches, 2)

    expect(first?.film.title).toBe('Closest')
    expect(first?.reasons).toContain('Shared Drama and Thriller DNA')
  })

  it('keeps only the requested number of top matches in stable score order', () => {
    const source = new Film(filmData({ id: 1, title: 'Source' }))
    const batches = new Map([
      [
        0,
        [
          filmData({ id: 1, title: 'Source' }),
          filmData({ id: 2, title: 'Closest', release_year: 2001 }),
          filmData({ id: 3, title: 'Also Close', release_year: 2001 }),
          filmData({
            id: 4,
            title: 'Distant',
            genres: 'Comedy',
            release_year: 1970,
          }),
        ],
      ],
    ])

    expect(
      getSimilarFilms(source, batches, 2).map(({ film }) => film.title),
    ).toEqual(['Closest', 'Also Close'])
    expect(getSimilarFilms(source, batches, 0)).toEqual([])
  })

  it('falls back to an English-likely record for default display metadata', async () => {
    const batches = new Map([
      [
        0,
        [
          filmData({
            id: 1,
            title: '特殊身份',
            production_countries: 'China',
          }),
          filmData({
            id: 2,
            title: 'The Replacement',
            production_countries: 'United Kingdom',
          }),
        ],
      ],
    ])

    const film = await getCellFilm(
      { id: 0, index: 0, subgrid: 0, subgridIndex: 0 } as never,
      batches,
    )

    expect(film?.title).toBe('The Replacement')
  })

  it('uses the root metadata batch when a wrapped batch has no English-likely records', async () => {
    const batches = new Map([
      [
        0,
        [
          filmData({
            id: 1,
            title: 'Root English',
            production_countries: 'Canada',
          }),
        ],
      ],
      [
        1,
        [
          filmData({
            id: 2,
            title: 'Ночные стражи',
            production_countries: 'Russia',
          }),
        ],
      ],
    ])

    const film = await getCellFilm(
      { id: 216, index: 216, subgrid: 1, subgridIndex: 0 } as never,
      batches,
    )

    expect(film?.title).toBe('Root English')
  })

  it('returns concise reasons for similar films', () => {
    const source = new Film(filmData({ id: 1, title: 'Source' }))
    const candidate = new Film(
      filmData({
        id: 2,
        title: 'Candidate',
        release_year: 2003,
        vote_average: 7.6,
      }),
    )

    expect(getSimilarityReasons(source, candidate)).toEqual([
      'Shared Drama and Thriller DNA',
      'Same era',
      'Similar TMDB score',
    ])
  })

  it('maps a similar film to its full atlas id and high-res target version', () => {
    const batches = new Map([
      [
        4,
        [
          filmData({ id: 10, title: 'Other' }),
          filmData({ id: 11, title: 'Target' }),
        ],
      ],
    ])
    const target = new Film(filmData({ id: 11, title: 'Target' }))
    const location = findFilmLocation(target, batches)
    const cell = { id: 0, subgrid: 0, subgridIndex: 0, targetMediaVersion: 1 }

    expect(location).toEqual({ subgrid: 4, subgridIndex: 1 })
    if (!location) throw new Error('Expected target film location')
    assignFilmToCell(cell as never, location)

    expect(cell.id).toBe(865)
    expect(cell.subgrid).toBe(4)
    expect(cell.subgridIndex).toBe(1)
    expect(cell.targetMediaVersion).toBe(2)
  })
  it('classifies films with local discovery tags', () => {
    const film = new Film(
      filmData({
        id: 2,
        title: 'Hidden Slow Burn',
        genres: 'Drama, Mystery',
        release_year: 1998,
        vote_average: 7.8,
        popularity: 20,
      }),
    )

    expect(getDiscoveryTags(film)).toEqual([
      'hidden-gem',
      'throwback',
      'slow-burn',
    ])
  })
})
