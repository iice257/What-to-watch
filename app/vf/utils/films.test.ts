import { describe, expect, it } from 'vitest'
import { Film, type FilmData, getSimilarFilms, scoreSimilarFilm } from './films'

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
  ...overrides,
})

describe('film similarity', () => {
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
  })
})
