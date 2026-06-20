import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '../../../utils/tw'
import { InfiniteMovieMenu } from './infinite-movie-menu'

type RawMovie = Record<string, unknown>

type TestMovie = {
  id: string
  rank: number
  title: string
  tagline: string
  overview: string
  genres: string[]
  year: string
  runtime: string
  rating: string
  countries: string
  posterUrl: string
}

type ViewMode = 'wall' | 'list'
type LoadState = 'loading' | 'ready' | 'error'

const WALL_COLUMNS = 12
const WALL_ROWS = 13
const DATASET_SIZE = WALL_COLUMNS * WALL_ROWS

const getText = (raw: RawMovie, key: string) => {
  const value = raw[key]
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const getNumber = (raw: RawMovie, key: string) => {
  const value = Number(raw[key])
  return Number.isFinite(value) ? value : 0
}

const splitList = (value: string, maxItems = 2) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280
  return value - Math.floor(value)
}

const shuffleMovies = (movies: TestMovie[]) =>
  [...movies]
    .map((movie, index) => ({ movie, sort: seededRandom(index + movie.rank) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ movie }) => movie)

const sortMoviesForList = (movies: TestMovie[]) =>
  [...movies].sort((movieA, movieB) => {
    const yearSort = movieB.year.localeCompare(movieA.year)
    return yearSort || movieA.title.localeCompare(movieB.title)
  })

const groupMoviesByYear = (movies: TestMovie[]) =>
  movies.reduce<Record<string, TestMovie[]>>((groups, movie) => {
    const year = movie.year || '----'
    groups[year] = [...(groups[year] ?? []), movie]
    return groups
  }, {})

const mapMovie = (raw: RawMovie, index: number): TestMovie => {
  const rating = getNumber(raw, 'vote_average')
  const year = getText(raw, 'release_year') || '----'

  return {
    id: getText(raw, 'id') || String(index),
    rank: index + 1,
    title: getText(raw, 'title') || `Untitled ${index + 1}`,
    tagline: getText(raw, 'tagline'),
    overview: getText(raw, 'overview'),
    genres: splitList(getText(raw, 'genres')),
    year,
    runtime: getText(raw, 'time_str') || `${getNumber(raw, 'runtime_minutes')}m`,
    rating: rating ? rating.toFixed(1) : 'N/A',
    countries: splitList(getText(raw, 'production_countries'), 1).join(', '),
    posterUrl: `/media/single/${index}.jpg`,
  }
}

export const TestGalleryApp = () => {
  const [movies, setMovies] = useState<TestMovie[]>([])
  const [mode, setMode] = useState<ViewMode>('wall')
  const [activeMovieId, setActiveMovieId] = useState<string | null>(null)
  const [detailsMovieId, setDetailsMovieId] = useState<string | null>(null)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [timeLabel, setTimeLabel] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch('/json/0.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load movie data (${response.status})`)
        }
        return response.json() as Promise<RawMovie[]>
      })
      .then((data) => {
        if (cancelled) return
        const nextMovies = data
          .slice(0, DATASET_SIZE)
          .map((movie, index) => mapMovie(movie, index))
        setMovies(nextMovies)
        setActiveMovieId(shuffleMovies(nextMovies)[0]?.id ?? null)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setErrorMessage(
          error instanceof Error ? error.message : 'Could not load movie data',
        )
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const updateTime = () => {
      setTimeLabel(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Africa/Lagos',
        }).format(new Date()),
      )
    }
    updateTime()
    const timer = window.setInterval(updateTime, 30000)
    return () => window.clearInterval(timer)
  }, [])

  const allGenres = useMemo(
    () => Array.from(new Set(movies.flatMap((movie) => movie.genres))).sort(),
    [movies],
  )

  const visibleMovies = useMemo(() => {
    const filteredMovies = activeGenre
      ? movies.filter((movie) => movie.genres.includes(activeGenre))
      : movies
    return shuffleMovies(filteredMovies).slice(0, DATASET_SIZE)
  }, [activeGenre, movies])

  useEffect(() => {
    if (
      visibleMovies.length > 0 &&
      !visibleMovies.some((movie) => movie.id === activeMovieId)
    ) {
      setActiveMovieId(visibleMovies[0].id)
    }
  }, [activeMovieId, visibleMovies])

  const listMovies = useMemo(
    () => sortMoviesForList(visibleMovies),
    [visibleMovies],
  )

  const activeMovie = useMemo(
    () =>
      visibleMovies.find((movie) => movie.id === activeMovieId) ??
      visibleMovies[0] ??
      null,
    [activeMovieId, visibleMovies],
  )

  const detailsMovie = useMemo(
    () =>
      visibleMovies.find((movie) => movie.id === detailsMovieId) ??
      movies.find((movie) => movie.id === detailsMovieId) ??
      null,
    [detailsMovieId, movies, visibleMovies],
  )

  const handleSelectMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
  }, [])

  const handleOpenMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
    setDetailsMovieId(movie.id)
  }, [])

  return (
    <main
      className="phantom-test-shell warp-shell min-h-dvh overflow-hidden bg-black text-white"
      onMouseMove={(event) => {
        const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5
        const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5
        document.documentElement.style.setProperty('--warp-pointer-x', `${x}`)
        document.documentElement.style.setProperty('--warp-pointer-y', `${y}`)
      }}
    >
      {mode === 'wall' ? (
        <WarpWall
          activeMovieId={activeMovie?.id ?? null}
          loadState={loadState}
          movies={visibleMovies}
          onOpenMovie={handleOpenMovie}
          onSelectMovie={handleSelectMovie}
        />
      ) : (
        <WarpList
          activeMovieId={activeMovie?.id ?? null}
          errorMessage={errorMessage}
          loadState={loadState}
          movies={listMovies}
          onOpenMovie={handleOpenMovie}
          onSelectMovie={handleSelectMovie}
        />
      )}

      <WarpChrome
        activeMovie={activeMovie}
        mode={mode}
        movieCount={visibleMovies.length}
        timeLabel={timeLabel}
        onModeChange={setMode}
      />

      <button
        type="button"
        className="warp-filter-button"
        aria-expanded={filterOpen}
        onClick={() => setFilterOpen((isOpen) => !isOpen)}
      >
        Filter
      </button>

      {filterOpen ? (
        <FilterPanel
          activeGenre={activeGenre}
          genres={allGenres}
          onSelectGenre={(genre) => {
            setActiveGenre(genre)
            setFilterOpen(false)
          }}
        />
      ) : null}

      {detailsMovie ? (
        <MovieDetailsCard
          movie={detailsMovie}
          onClose={() => setDetailsMovieId(null)}
          onSelectGenre={(genre) => {
            setActiveGenre(genre)
            setDetailsMovieId(null)
            setMode('wall')
          }}
        />
      ) : null}
    </main>
  )
}

type WarpWallProps = {
  activeMovieId: string | null
  loadState: LoadState
  movies: TestMovie[]
  onOpenMovie: (movie: TestMovie) => void
  onSelectMovie: (movie: TestMovie) => void
}

const WarpWall = ({
  activeMovieId,
  loadState,
  movies,
  onOpenMovie,
  onSelectMovie,
}: WarpWallProps) => {
  const menuItems = useMemo(
    () =>
      movies.map((movie) => ({
        id: movie.id,
        image: movie.posterUrl,
        title: movie.title,
        description: movie.genres.join(' / ') || movie.overview || 'Movie',
        meta: `${movie.year} / ${movie.rating} / ${movie.runtime}`,
        payload: movie,
      })),
    [movies],
  )

  const handleActiveItemChange = useCallback(
    (item: (typeof menuItems)[number]) => onSelectMovie(item.payload),
    [onSelectMovie],
  )

  const handleSelectItem = useCallback(
    (item: (typeof menuItems)[number]) => onOpenMovie(item.payload),
    [onOpenMovie],
  )

  if (loadState === 'error') {
    return (
      <section className="warp-message">
        Movie data could not load. Refresh and try again.
      </section>
    )
  }

  return (
    <section className="warp-wall" aria-label="Warp Wall movie gallery">
      <InfiniteMovieMenu
        activeId={activeMovieId}
        items={menuItems}
        loadState={loadState}
        scale={0.9}
        onActiveItemChange={handleActiveItemChange}
        onSelectItem={handleSelectItem}
      />
    </section>
  )
}

type WarpListProps = {
  activeMovieId: string | null
  errorMessage: string
  loadState: LoadState
  movies: TestMovie[]
  onOpenMovie: (movie: TestMovie) => void
  onSelectMovie: (movie: TestMovie) => void
}

const WarpList = ({
  activeMovieId,
  errorMessage,
  loadState,
  movies,
  onOpenMovie,
  onSelectMovie,
}: WarpListProps) => {
  const groupedMovies = useMemo(() => {
    const groups = groupMoviesByYear(movies)
    return Object.entries(groups).sort(([yearA], [yearB]) =>
      yearB.localeCompare(yearA),
    )
  }, [movies])

  return (
    <section className="warp-list" aria-label="Movie list view">
      <header className="warp-list-heading">
        <h1>All movies</h1>
        <p>{loadState === 'ready' ? `${movies.length} movies` : loadState}</p>
      </header>

      {loadState === 'error' ? (
        <p className="warp-list-error">{errorMessage}</p>
      ) : null}

      <div className="warp-list-groups">
        {groupedMovies.map(([year, yearMovies]) => (
          <section className="warp-list-group" key={year}>
            <h2>{year}</h2>
            <div className="warp-list-rows">
              {yearMovies.map((movie) => (
                <button
                  type="button"
                  key={movie.id}
                  className={cn(
                    'warp-list-row',
                    activeMovieId === movie.id && 'is-active',
                  )}
                  onClick={() => onOpenMovie(movie)}
                  onFocus={() => onSelectMovie(movie)}
                  onMouseEnter={() => onSelectMovie(movie)}
                >
                  <span>{movie.title}</span>
                  <span>{movie.genres[0] ?? 'Movie'}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

type WarpChromeProps = {
  activeMovie: TestMovie | null
  mode: ViewMode
  movieCount: number
  timeLabel: string
  onModeChange: (mode: ViewMode) => void
}

const WarpChrome = ({
  activeMovie,
  mode,
  movieCount,
  timeLabel,
  onModeChange,
}: WarpChromeProps) => (
  <>
    <header className="warp-topbar">
      <a href="/" className="warp-mark" aria-label="What to Watch home">
        <svg viewBox="0 0 64 78" aria-hidden="true">
          <path d="M33.5 4.5c8.2 1.4 17.8 14.4 21.3 28.1 3.7 14.1-.9 30.2-9.8 35.7-2.9 1.8-5.3-3.9-8.5-2.5-4.4 2-7 7.1-10.8 5.9-3.5-1.1-3.2-7.2-6.3-8.7-4.1-2-8.9 2.7-10.4-.6C4.7 53.8 5.7 35.6 11.5 23 16.6 11.8 25.3 3.1 33.5 4.5Z" />
          <path d="M24.2 31.7c.5-4.1 3.3-7.2 7-7.7 5.2-.7 10.3 4.5 11.2 11.4" />
        </svg>
      </a>
      <div className="warp-sound">
        <span />
        Sound [Off]
      </div>
      <p className="warp-manifesto">
        What to Watch is a movie-led discovery wall built for indecisive nights.
      </p>
      <div className="warp-clock">
        <strong>{timeLabel || '--:--'} GMT+1</strong>
        <span>London, UK</span>
        <span>Lagos, NG</span>
      </div>
      <a className="warp-cta" href="/">
        Let&apos;s Watch
      </a>
    </header>

    <div className="warp-active-peek" aria-live="polite">
      <span>{activeMovie?.title ?? 'Loading'}</span>
      <span>
        {activeMovie
          ? `${activeMovie.year} / ${activeMovie.rating} / ${movieCount} loaded`
          : `${movieCount} loading`}
      </span>
    </div>

    <nav className="warp-mode-toggle" aria-label="View mode">
      <button
        type="button"
        aria-label="Warp Wall"
        aria-pressed={mode === 'wall'}
        onClick={() => onModeChange('wall')}
      >
        <span className="warp-grid-icon" />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={mode === 'list'}
        onClick={() => onModeChange('list')}
      >
        <span className="warp-list-icon" />
      </button>
    </nav>

    <nav className="warp-main-nav" aria-label="Test navigation">
      <a className="is-active" href="/test">
        Watch
      </a>
      <a href="/test">About</a>
      <a href="/test">Genres</a>
    </nav>
  </>
)

type FilterPanelProps = {
  activeGenre: string | null
  genres: string[]
  onSelectGenre: (genre: string | null) => void
}

const FilterPanel = ({
  activeGenre,
  genres,
  onSelectGenre,
}: FilterPanelProps) => (
  <aside className="warp-filter-panel">
    <p>Filter by genre</p>
    <button
      type="button"
      className={cn(!activeGenre && 'is-active')}
      onClick={() => onSelectGenre(null)}
    >
      All movies
    </button>
    {genres.map((genre) => (
      <button
        type="button"
        className={cn(activeGenre === genre && 'is-active')}
        key={genre}
        onClick={() => onSelectGenre(genre)}
      >
        {genre}
      </button>
    ))}
  </aside>
)

type MovieDetailsCardProps = {
  movie: TestMovie
  onClose: () => void
  onSelectGenre: (genre: string) => void
}

const MovieDetailsCard = ({
  movie,
  onClose,
  onSelectGenre,
}: MovieDetailsCardProps) => (
  <section className="warp-details-layer" aria-label={`${movie.title} details`}>
    <button
      type="button"
      className="warp-details-backdrop"
      aria-label="Close details"
      onClick={onClose}
    />
    <article className="warp-details-card">
      <button
        type="button"
        className="warp-details-close"
        aria-label="Close details"
        onClick={onClose}
      >
        Close
      </button>
      <div className="warp-details-poster">
        <img src={movie.posterUrl} alt="" />
      </div>
      <div className="warp-details-copy">
        <p className="warp-details-kicker">
          {movie.year} / {movie.rating} / {movie.runtime}
        </p>
        <h2>{movie.title}</h2>
        {movie.tagline ? <p className="warp-details-tagline">{movie.tagline}</p> : null}
        <p className="warp-details-overview">
          {movie.overview || 'No overview available yet.'}
        </p>
        <div className="warp-details-genres">
          {movie.genres.map((genre) => (
            <button type="button" key={genre} onClick={() => onSelectGenre(genre)}>
              {genre}
            </button>
          ))}
        </div>
        <p className="warp-details-origin">{movie.countries || 'Cinema'}</p>
      </div>
    </article>
  </section>
)
