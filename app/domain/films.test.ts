import { describe, expect, it } from 'vitest'
import {
  Film,
  getDiscoveryTags,
  getSimilarFilms,
  scoreSimilarFilm,
} from './films'

const film = (
  id: number,
  title: string,
  genres: string,
  year: number,
  rating: number,
  popularity: number,
) =>
  new Film({
    id,
    title,
    genres,
    release_year: year,
    vote_average: rating,
    popularity,
    poster_path: '',
    backdrop_path: '',
  })

describe('film recommendations', () => {
  it('ranks related movies ahead of unrelated movies', () => {
    const source = film(1, 'Source', 'Action, Adventure', 2020, 8, 50)
    const related = film(2, 'Related', 'Action, Adventure', 2019, 7.8, 45)
    const unrelated = film(3, 'Unrelated', 'Documentary', 1980, 4, 2)

    expect(scoreSimilarFilm(source, related)).toBeGreaterThan(
      scoreSimilarFilm(source, unrelated),
    )
    expect(getSimilarFilms(source, [unrelated, related], 1)[0]?.film).toBe(
      related,
    )
  })

  it('produces reusable discovery tags', () => {
    expect(
      getDiscoveryTags(film(1, 'Pick', 'Action, Comedy', 2026, 8, 50)),
    ).toEqual(
      expect.arrayContaining(['crowd-pleaser', 'recent-pick', 'comfort-watch']),
    )
  })

  it('excludes the source movie from recommendations', () => {
    const source = film(1, 'Source', 'Drama', 2020, 8, 20)
    expect(getSimilarFilms(source, [source])).toEqual([])
  })
})
