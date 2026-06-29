import {
  type WheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cn } from '../../../utils/tw'
import {
  InfiniteMovieMenu,
  type InfiniteMovieMenuItem,
} from './infinite-movie-menu'

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
  fallbackPosterUrl?: string
}

type ViewMode = 'wall' | 'list' | 'genres'
type ListGrouping = 'year' | 'alpha'
type LoadState = 'loading' | 'ready' | 'error'
type GenreSummary = {
  count: number
  genre: string
}

const DATASET_FILE_COUNT = 5
const INDEX_CATALOG_COUNT = 57294
const LIST_WINDOW_SIZE = 10000
const LOCAL_POSTER_COUNT = 216
const GALLERY_WINDOW_SIZE = 1000
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342'

const getText = (raw: RawMovie, key: string) => {
  const value = raw[key]
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const getNumber = (raw: RawMovie, key: string) => {
  const value = Number(raw[key])
  return Number.isFinite(value) ? value : 0
}

const splitList = (value: string, maxItems = Number.POSITIVE_INFINITY) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280
  return value - Math.floor(value)
}

const getYearNumber = (movie: TestMovie) => {
  const year = Number(movie.year)
  return Number.isFinite(year) ? year : 0
}

const formatRuntime = (runtime: string) => {
  const value = runtime.trim()
  if (!value || value === '0' || value === '0:00' || value === '0m') return '-'
  return value
}

const formatMovieMeta = (movie: TestMovie) =>
  `Year: ${movie.year && movie.year !== '----' ? movie.year : '-'} / Rating: ${
    movie.rating && movie.rating !== 'N/A' ? movie.rating : '-'
  } / Hour: ${formatRuntime(movie.runtime)}`

const hasLatinLeadingTitle = (movie: TestMovie) =>
  /^[A-Za-z]/.test(movie.title.trim())

export const getGenreOverlap = (movie: TestMovie, selectedGenres: string[]) => {
  if (!selectedGenres.length) return 0
  const movieGenres = new Set(movie.genres)
  return selectedGenres.filter((genre) => movieGenres.has(genre)).length
}

export const filterMoviesByGenres = (
  movies: TestMovie[],
  selectedGenres: string[],
) => {
  if (!selectedGenres.length) return movies
  return movies.filter((movie) => getGenreOverlap(movie, selectedGenres) > 0)
}

export const getGalleryWindow = (
  movies: TestMovie[],
  selectedGenres: string[],
  limit = GALLERY_WINDOW_SIZE,
) =>
  [...movies]
    .map((movie, index) => ({
      movie,
      overlap: getGenreOverlap(movie, selectedGenres),
      sort: seededRandom(index + movie.rank + selectedGenres.length * 97),
    }))
    .sort(
      (a, b) =>
        b.overlap - a.overlap || b.movie.rank - a.movie.rank || a.sort - b.sort,
    )
    .slice(0, limit)
    .map(({ movie }) => movie)

export const sortMoviesForList = (
  movies: TestMovie[],
  grouping: ListGrouping,
) => {
  const sortableMovies =
    grouping === 'alpha' ? movies.filter(hasLatinLeadingTitle) : movies

  return [...sortableMovies].sort((movieA, movieB) => {
    if (grouping === 'alpha') {
      return (
        movieA.title.localeCompare(movieB.title) ||
        getYearNumber(movieA) - getYearNumber(movieB)
      )
    }

    return (
      getYearNumber(movieA) - getYearNumber(movieB) ||
      movieA.title.localeCompare(movieB.title)
    )
  })
}

export const groupMoviesByYear = (movies: TestMovie[]) =>
  movies.reduce<Record<string, TestMovie[]>>((groups, movie) => {
    const year = movie.year || '----'
    groups[year] = [...(groups[year] ?? []), movie]
    return groups
  }, {})

export const groupMoviesAlphabetically = (movies: TestMovie[]) =>
  movies.reduce<Record<string, TestMovie[]>>((groups, movie) => {
    const letter = movie.title.charAt(0).toUpperCase() || '#'
    const key = /[A-Z]/.test(letter) ? letter : '#'
    groups[key] = [...(groups[key] ?? []), movie]
    return groups
  }, {})

const getGenreSummaries = (movies: TestMovie[]): GenreSummary[] => {
  const counts = movies.reduce<Record<string, number>>((summary, movie) => {
    movie.genres.forEach((genre) => {
      summary[genre] = (summary[genre] ?? 0) + 1
    })
    return summary
  }, {})

  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
}

const mapMovie = (raw: RawMovie, index: number): TestMovie => {
  const rating = getNumber(raw, 'vote_average')
  const year = getText(raw, 'release_year') || '----'
  const rawId = getText(raw, 'id')
  const fallbackPosterUrl = `/media/single/${index % LOCAL_POSTER_COUNT}.jpg`
  const posterPath = getText(raw, 'poster_path')

  return {
    id: rawId ? `${index}-${rawId}` : String(index),
    rank: index + 1,
    title: getText(raw, 'title') || `Untitled ${index + 1}`,
    tagline: getText(raw, 'tagline'),
    overview: getText(raw, 'overview'),
    genres: splitList(getText(raw, 'genres')),
    year,
    runtime:
      getText(raw, 'time_str') || `${getNumber(raw, 'runtime_minutes')}m`,
    rating: rating ? rating.toFixed(1) : 'N/A',
    countries: splitList(getText(raw, 'production_countries'), 1).join(', '),
    posterUrl: posterPath
      ? `${TMDB_POSTER_BASE_URL}${posterPath}`
      : fallbackPosterUrl,
    fallbackPosterUrl,
  }
}

export const TestGalleryApp = () => {
  const [movies, setMovies] = useState<TestMovie[]>([])
  const [mode, setMode] = useState<ViewMode>('wall')
  const [listGrouping, setListGrouping] = useState<ListGrouping>('year')
  const [activeMovieId, setActiveMovieId] = useState<string | null>(null)
  const [detailsMovieId, setDetailsMovieId] = useState<string | null>(null)
  const [watchMovieId, setWatchMovieId] = useState<string | null>(null)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [aboutMaximized, setAboutMaximized] = useState(false)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [timeLabel, setTimeLabel] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all(
      Array.from({ length: DATASET_FILE_COUNT }, (_, index) =>
        fetch(`/json/${index}.json`).then((response) => {
          if (!response.ok) {
            throw new Error(`Could not load movie data (${response.status})`)
          }
          return response.json() as Promise<RawMovie[]>
        }),
      ),
    )
      .then((datasets) => {
        if (cancelled) return
        const nextMovies = datasets
          .flat()
          .slice(0, LIST_WINDOW_SIZE)
          .map(mapMovie)
        setMovies(nextMovies)
        setActiveMovieId(nextMovies[0]?.id ?? null)
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

  const genreSummaries = useMemo(() => getGenreSummaries(movies), [movies])

  const filteredMovies = useMemo(
    () => filterMoviesByGenres(movies, selectedGenres),
    [movies, selectedGenres],
  )

  const visibleMovies = useMemo(
    () => getGalleryWindow(filteredMovies, selectedGenres),
    [filteredMovies, selectedGenres],
  )

  useEffect(() => {
    if (
      visibleMovies.length > 0 &&
      !visibleMovies.some((movie) => movie.id === activeMovieId)
    ) {
      setActiveMovieId(visibleMovies[0].id)
    }
  }, [activeMovieId, visibleMovies])

  const listMovies = useMemo(
    () =>
      sortMoviesForList(filteredMovies, listGrouping).slice(
        0,
        LIST_WINDOW_SIZE,
      ),
    [filteredMovies, listGrouping],
  )

  const activeMovie = useMemo(
    () =>
      movies.find((movie) => movie.id === activeMovieId) ??
      visibleMovies[0] ??
      null,
    [activeMovieId, movies, visibleMovies],
  )

  const detailsMovie = useMemo(
    () => movies.find((movie) => movie.id === detailsMovieId) ?? null,
    [detailsMovieId, movies],
  )

  const watchMovie = useMemo(
    () => movies.find((movie) => movie.id === watchMovieId) ?? null,
    [movies, watchMovieId],
  )

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((currentGenres) =>
      currentGenres.includes(genre)
        ? currentGenres.filter((currentGenre) => currentGenre !== genre)
        : [...currentGenres, genre],
    )
  }, [])

  const clearGenres = useCallback(() => setSelectedGenres([]), [])

  const handleSelectMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
  }, [])

  const handleOpenMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
    setDetailsMovieId(movie.id)
  }, [])

  const handleOpenWatchLinks = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
    setWatchMovieId(movie.id)
    setAboutOpen(false)
    setFilterOpen(false)
  }, [])

  const handlePickRandomMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
    setFilterOpen(false)
    setAboutOpen(false)
    setDetailsMovieId(null)
  }, [])

  useEffect(() => {
    if (!detailsMovieId && !watchMovieId) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsMovieId(null)
      if (event.key === 'Escape') setWatchMovieId(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detailsMovieId, watchMovieId])

  return (
    <main
      className='phantom-test-shell warp-shell min-h-dvh overflow-hidden bg-black text-white'
      data-mode={mode}
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
          isDetailsOpen={Boolean(detailsMovieId)}
          loadState={loadState}
          movies={visibleMovies}
          onOpenMovie={handleOpenMovie}
          onSelectMovie={handleSelectMovie}
        />
      ) : null}

      {mode === 'list' ? (
        <WarpList
          activeMovieId={activeMovie?.id ?? null}
          errorMessage={errorMessage}
          grouping={listGrouping}
          loadState={loadState}
          movies={listMovies}
          totalMovieCount={INDEX_CATALOG_COUNT}
          onGroupingChange={setListGrouping}
          onOpenMovie={handleOpenMovie}
          onPickRandomMovie={handlePickRandomMovie}
          onSelectMovie={handleSelectMovie}
        />
      ) : null}

      {mode === 'genres' ? (
        <GenresView
          genres={genreSummaries}
          resultCount={filteredMovies.length}
          selectedGenres={selectedGenres}
          onBackToGallery={() => setMode('wall')}
          onClear={clearGenres}
          onToggleGenre={toggleGenre}
        />
      ) : null}

      <WarpChrome
        aboutOpen={aboutOpen}
        activeMovie={activeMovie}
        mode={mode}
        movieCount={INDEX_CATALOG_COUNT}
        selectedGenreCount={selectedGenres.length}
        timeLabel={timeLabel}
        onOpenAbout={() => {
          setAboutOpen(true)
          setFilterOpen(false)
        }}
        onOpenActiveMovie={() => {
          if (activeMovie) handleOpenWatchLinks(activeMovie)
        }}
        onOpenGenres={() => {
          setMode('genres')
          setAboutOpen(false)
          setFilterOpen(false)
        }}
        onResetGallery={() => {
          clearGenres()
          setDetailsMovieId(null)
          setWatchMovieId(null)
          setFilterOpen(false)
          setAboutOpen(false)
          setMode('wall')
        }}
        onShowWall={() => {
          setFilterOpen(false)
          setAboutOpen(false)
          setMode('wall')
        }}
        onModeChange={(nextMode) => {
          setAboutOpen(false)
          setFilterOpen(false)
          setMode(nextMode)
        }}
      />

      <div className='warp-filter-actions'>
        {filterOpen && selectedGenres.length ? (
          <button
            type='button'
            className='warp-filter-reset'
            aria-label='Reset filters'
            onClick={clearGenres}
          >
            Reset
          </button>
        ) : null}
        <button
          type='button'
          className='warp-filter-button'
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((isOpen) => !isOpen)}
        >
          Filter
          {selectedGenres.length ? <span>{selectedGenres.length}</span> : null}
        </button>
      </div>

      {filterOpen ? (
        <FilterPanel
          genres={genreSummaries}
          resultCount={filteredMovies.length}
          selectedGenres={selectedGenres}
          onClear={clearGenres}
          onToggleGenre={toggleGenre}
        />
      ) : null}

      {aboutOpen ? (
        <AboutDrawer
          maximized={aboutMaximized}
          onClose={() => setAboutOpen(false)}
          onToggleMaximized={() =>
            setAboutMaximized((isMaximized) => !isMaximized)
          }
        />
      ) : null}

      {watchMovie ? (
        <WatchLinksDialog
          movie={watchMovie}
          onClose={() => setWatchMovieId(null)}
        />
      ) : null}

      {detailsMovie ? (
        <MovieDetailsCard
          movie={detailsMovie}
          onClose={() => setDetailsMovieId(null)}
          onSelectGenre={(genre) => {
            setSelectedGenres([genre])
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
  isDetailsOpen: boolean
  loadState: LoadState
  movies: TestMovie[]
  onOpenMovie: (movie: TestMovie) => void
  onSelectMovie: (movie: TestMovie) => void
}

const WarpWall = ({
  activeMovieId,
  isDetailsOpen,
  loadState,
  movies,
  onOpenMovie,
  onSelectMovie,
}: WarpWallProps) => {
  const menuItems = useMemo<InfiniteMovieMenuItem<TestMovie>[]>(
    () =>
      movies.map((movie) => ({
        id: movie.id,
        fallbackImage: movie.fallbackPosterUrl,
        image: movie.posterUrl,
        title: movie.title,
        description:
          movie.genres.slice(0, 2).join(' / ') || movie.overview || 'Movie',
        meta: formatMovieMeta(movie),
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
      <section className='warp-message'>
        Movie data could not load. Refresh and try again.
      </section>
    )
  }

  return (
    <section className='warp-wall' aria-label='Warp Wall movie gallery'>
      <InfiniteMovieMenu
        activeId={activeMovieId}
        isDetailsOpen={isDetailsOpen}
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
  grouping: ListGrouping
  loadState: LoadState
  movies: TestMovie[]
  totalMovieCount: number
  onGroupingChange: (grouping: ListGrouping) => void
  onOpenMovie: (movie: TestMovie) => void
  onPickRandomMovie: (movie: TestMovie) => void
  onSelectMovie: (movie: TestMovie) => void
}

const WarpList = ({
  activeMovieId,
  errorMessage,
  grouping,
  loadState,
  movies,
  totalMovieCount,
  onGroupingChange,
  onOpenMovie,
  onPickRandomMovie,
  onSelectMovie,
}: WarpListProps) => {
  const [randomPulseId, setRandomPulseId] = useState<string | null>(null)
  const pulseTimerRef = useRef<number | null>(null)

  const groupedMovies = useMemo(() => {
    const groups =
      grouping === 'alpha'
        ? groupMoviesAlphabetically(movies)
        : groupMoviesByYear(movies)
    return Object.entries(groups).sort(([groupA], [groupB]) =>
      grouping === 'alpha'
        ? groupA.localeCompare(groupB)
        : Number(groupA) - Number(groupB),
    )
  }, [grouping, movies])

  useEffect(
    () => () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    },
    [],
  )

  const handlePickRandomMovie = () => {
    const movie = movies[Math.floor(Math.random() * Math.max(movies.length, 1))]
    if (!movie) return

    onPickRandomMovie(movie)
    setRandomPulseId(movie.id)
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    pulseTimerRef.current = window.setTimeout(() => {
      setRandomPulseId(null)
      pulseTimerRef.current = null
    }, 1100)

    window.requestAnimationFrame(() => {
      const scroller = document.querySelector<HTMLElement>('.warp-list')
      const row = document.querySelector<HTMLElement>(
        `[data-movie-id="${movie.id}"]`,
      )
      if (!scroller || !row) return

      const startTop = scroller.scrollTop
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const targetTop = Math.max(
        0,
        Math.min(
          maxTop,
          row.offsetTop - scroller.clientHeight / 2 + row.clientHeight / 2,
        ),
      )
      const duration = 520
      const startTime = performance.now()
      const animateScroll = (time: number) => {
        const progress = Math.min(1, (time - startTime) / duration)
        const eased = 1 - (1 - progress) ** 3
        scroller.scrollTop = startTop + (targetTop - startTop) * eased
        if (progress < 1) window.requestAnimationFrame(animateScroll)
      }

      window.requestAnimationFrame(animateScroll)
    })
  }

  return (
    <section className='warp-list' aria-label='Movie list view'>
      <header className='warp-list-heading'>
        <div className='warp-list-sort' aria-label='Movie index grouping'>
          <button
            type='button'
            className={cn(grouping === 'year' && 'is-active')}
            aria-pressed={grouping === 'year'}
            onClick={() => onGroupingChange('year')}
          >
            By year
          </button>
          <button
            type='button'
            className={cn(grouping === 'alpha' && 'is-active')}
            aria-pressed={grouping === 'alpha'}
            onClick={() => onGroupingChange('alpha')}
          >
            Alphabetical
          </button>
        </div>
        <div className='warp-list-title'>
          <h1>Movie Index</h1>
          <p>
            {loadState === 'ready'
              ? `${totalMovieCount.toLocaleString()} movies in index`
              : loadState}
          </p>
        </div>
        <button
          type='button'
          className={cn('warp-random-cta', randomPulseId && 'is-rolling')}
          aria-label='Pick random movie'
          disabled={!movies.length}
          onClick={handlePickRandomMovie}
        >
          <span className='warp-dice-face' aria-hidden='true'>
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>

      {loadState === 'error' ? (
        <p className='warp-list-error'>{errorMessage}</p>
      ) : null}

      <div className='warp-list-groups'>
        {groupedMovies.map(([year, yearMovies]) => (
          <section className='warp-list-group' key={year}>
            <h2>{year}</h2>
            <div className='warp-list-rows'>
              {yearMovies.map((movie) => (
                <button
                  type='button'
                  key={movie.id}
                  data-movie-id={movie.id}
                  className={cn(
                    'warp-list-row',
                    activeMovieId === movie.id && 'is-active',
                    randomPulseId === movie.id && 'is-random-pulse',
                  )}
                  onClick={() => onOpenMovie(movie)}
                  onFocus={() => onSelectMovie(movie)}
                  onMouseEnter={() => onSelectMovie(movie)}
                >
                  <span className='warp-list-row-poster' aria-hidden='true'>
                    <img
                      src={movie.posterUrl}
                      alt=''
                      loading='lazy'
                      onError={(event) => {
                        if (!movie.fallbackPosterUrl) return
                        if (
                          event.currentTarget.src.endsWith(
                            movie.fallbackPosterUrl,
                          )
                        )
                          return
                        event.currentTarget.src = movie.fallbackPosterUrl
                      }}
                    />
                  </span>
                  <span className='warp-list-row-main'>
                    <span className='warp-list-row-title'>{movie.title}</span>
                    <span className='warp-list-row-meta'>
                      {formatMovieMeta(movie)}
                    </span>
                  </span>
                  <span className='warp-list-row-genres'>
                    {(movie.genres.length ? movie.genres : ['Movie'])
                      .slice(0, 3)
                      .map((genre) => (
                        <span key={genre}>{genre}</span>
                      ))}
                  </span>
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
  aboutOpen: boolean
  activeMovie: TestMovie | null
  mode: ViewMode
  movieCount: number
  selectedGenreCount: number
  timeLabel: string
  onOpenAbout: () => void
  onOpenActiveMovie: () => void
  onOpenGenres: () => void
  onResetGallery: () => void
  onShowWall: () => void
  onModeChange: (mode: ViewMode) => void
}

const WarpChrome = ({
  aboutOpen,
  activeMovie,
  mode,
  movieCount,
  selectedGenreCount,
  timeLabel,
  onOpenAbout,
  onOpenActiveMovie,
  onOpenGenres,
  onResetGallery,
  onShowWall,
  onModeChange,
}: WarpChromeProps) => (
  <>
    <header className='warp-topbar'>
      <button
        type='button'
        className='warp-mark'
        aria-label='Reset gallery'
        onClick={onResetGallery}
      >
        <span className='sr-only'>Reset gallery</span>
        <svg viewBox='0 0 64 78' aria-hidden='true'>
          <path d='M33.5 4.5c8.2 1.4 17.8 14.4 21.3 28.1 3.7 14.1-.9 30.2-9.8 35.7-2.9 1.8-5.3-3.9-8.5-2.5-4.4 2-7 7.1-10.8 5.9-3.5-1.1-3.2-7.2-6.3-8.7-4.1-2-8.9 2.7-10.4-.6C4.7 53.8 5.7 35.6 11.5 23 16.6 11.8 25.3 3.1 33.5 4.5Z' />
          <path d='M24.2 31.7c.5-4.1 3.3-7.2 7-7.7 5.2-.7 10.3 4.5 11.2 11.4' />
        </svg>
        <span className='warp-brand-name'>ScrollFlix</span>
      </button>
      <p className='warp-manifesto'>
        What to Watch is a movie-led discovery wall built for indecisive nights.
      </p>
      <div className='warp-clock'>
        <strong>{timeLabel || '--:--'} WAT</strong>
        <span>Lagos, NG</span>
      </div>
      <button
        type='button'
        className='warp-cta'
        disabled={!activeMovie}
        onClick={onOpenActiveMovie}
      >
        Let&apos;s Watch
      </button>
    </header>

    <div className='warp-active-peek' aria-live='polite'>
      <span>{activeMovie?.title ?? 'Loading'}</span>
      <span>
        {activeMovie ? formatMovieMeta(activeMovie) : `${movieCount} loading`}
      </span>
    </div>

    <nav className='warp-mode-toggle' aria-label='View mode'>
      <button
        type='button'
        aria-label='Gallery'
        aria-pressed={mode === 'wall'}
        onClick={() => onModeChange('wall')}
      >
        <span className='warp-grid-icon' />
      </button>
      <button
        type='button'
        aria-label='Movie index'
        aria-pressed={mode === 'list'}
        onClick={() => onModeChange('list')}
      >
        <span className='warp-list-icon' />
      </button>
    </nav>

    <nav className='warp-main-nav' aria-label='Gallery navigation'>
      <button
        type='button'
        className={cn(mode === 'wall' && !aboutOpen && 'is-active')}
        aria-pressed={mode === 'wall' && !aboutOpen}
        onClick={onShowWall}
      >
        Watch
      </button>
      <button
        type='button'
        className={cn(aboutOpen && 'is-active')}
        aria-expanded={aboutOpen}
        onClick={onOpenAbout}
      >
        About
      </button>
      <button
        type='button'
        className={cn(mode === 'genres' && 'is-active')}
        aria-pressed={mode === 'genres'}
        onClick={onOpenGenres}
      >
        Genres
        {selectedGenreCount ? <span>{selectedGenreCount}</span> : null}
      </button>
    </nav>
  </>
)

type FilterPanelProps = {
  genres: GenreSummary[]
  resultCount: number
  selectedGenres: string[]
  onClear: () => void
  onToggleGenre: (genre: string) => void
}

const FilterPanel = ({
  genres,
  resultCount,
  selectedGenres,
  onClear,
  onToggleGenre,
}: FilterPanelProps) => (
  <aside className='warp-filter-panel'>
    <div className='warp-filter-panel-heading'>
      <p>Stack filters</p>
      <span>{resultCount} matches</span>
    </div>
    <button
      type='button'
      className={cn(!selectedGenres.length && 'is-active')}
      onClick={onClear}
    >
      All movies
    </button>
    {genres.map(({ genre, count }) => (
      <button
        type='button'
        className={cn(selectedGenres.includes(genre) && 'is-active')}
        key={genre}
        aria-pressed={selectedGenres.includes(genre)}
        onClick={() => onToggleGenre(genre)}
      >
        <span>{genre}</span>
        <span>{count}</span>
      </button>
    ))}
  </aside>
)

type GenresViewProps = {
  genres: GenreSummary[]
  resultCount: number
  selectedGenres: string[]
  onBackToGallery: () => void
  onClear: () => void
  onToggleGenre: (genre: string) => void
}

const GenresView = ({
  genres,
  resultCount,
  selectedGenres,
  onBackToGallery,
  onClear,
  onToggleGenre,
}: GenresViewProps) => (
  <section className='warp-genres-view' aria-label='Genre curation'>
    <header>
      <div>
        <h1>Genres</h1>
        <p>
          Select one or more lanes. The gallery ranks exact overlap first, then
          keeps the wall full from the wider matching set.
        </p>
      </div>
      <div className='warp-genres-actions'>
        <button
          type='button'
          onClick={onClear}
          disabled={!selectedGenres.length}
        >
          Clear
        </button>
        <button type='button' onClick={onBackToGallery}>
          Back to gallery
        </button>
      </div>
    </header>
    <div className='warp-genres-summary'>
      <span>{selectedGenres.length || 'All'} selected</span>
      <span>{resultCount} matching movies</span>
    </div>
    <div className='warp-genres-grid'>
      {genres.map(({ genre, count }) => (
        <button
          type='button'
          key={genre}
          className={cn(selectedGenres.includes(genre) && 'is-active')}
          aria-pressed={selectedGenres.includes(genre)}
          onClick={() => onToggleGenre(genre)}
        >
          <span>{genre}</span>
          <span>{count}</span>
        </button>
      ))}
    </div>
  </section>
)

type AboutDrawerProps = {
  maximized: boolean
  onClose: () => void
  onToggleMaximized: () => void
}

const AboutDrawer = ({
  maximized,
  onClose,
  onToggleMaximized,
}: AboutDrawerProps) => (
  <aside className={cn('warp-about-drawer', maximized && 'is-maximized')}>
    <button
      type='button'
      className='warp-about-handle'
      aria-label={maximized ? 'Minimize about drawer' : 'Maximize about drawer'}
      onClick={onToggleMaximized}
    >
      <span />
    </button>
    <div className='warp-about-copy'>
      <p className='warp-about-kicker'>About the gallery</p>
      <h2>One wall, many ways in.</h2>
      <p>
        This is a browsing surface for finding something to watch by feel:
        rotate the globe, tap a title for detail, or curate a genre lane before
        diving back into the gallery.
      </p>
      <p>
        Movie metadata and poster imagery are provided for discovery and
        prototype evaluation. Ratings, runtimes, years, countries, genres, and
        summaries can be incomplete or stale, so treat them as guidance rather
        than an editorial verdict.
      </p>
      <div className='warp-about-actions'>
        <button type='button' onClick={onToggleMaximized}>
          {maximized ? 'Minimize' : 'Maximize'}
        </button>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </aside>
)

const WATCH_LINKS = [
  { label: 'Netflix', meta: 'Subscription' },
  { label: 'Prime Video', meta: 'Rent or buy' },
  { label: 'Apple TV', meta: 'Rent or buy' },
  { label: 'YouTube', meta: 'Trailer' },
]

type WatchLinksDialogProps = {
  movie: TestMovie
  onClose: () => void
}

const WatchLinksDialog = ({ movie, onClose }: WatchLinksDialogProps) => (
  <section
    className='warp-watch-layer'
    aria-label={`${movie.title} watch links`}
  >
    <button
      type='button'
      className='warp-watch-backdrop'
      aria-label='Close watch links'
      onClick={onClose}
    />
    <dialog
      className='warp-watch-card'
      aria-label={`${movie.title} watch options`}
      aria-modal='true'
      open
    >
      <button
        type='button'
        className='warp-watch-close'
        aria-label='Close watch links'
        onClick={onClose}
      >
        Close
      </button>
      <p className='warp-watch-kicker'>Watch options</p>
      <h2>{movie.title}</h2>
      <p className='warp-watch-meta'>{formatMovieMeta(movie)}</p>
      <div className='warp-watch-links'>
        {WATCH_LINKS.map((link) => (
          <button type='button' key={link.label} disabled>
            <span>{link.label}</span>
            <span>{link.meta}</span>
          </button>
        ))}
      </div>
    </dialog>
  </section>
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
}: MovieDetailsCardProps) => {
  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    const isDesktopWheel =
      window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
    if (isDesktopWheel && event.deltaY > 10) onClose()
  }

  return (
    <section
      className='warp-details-layer'
      aria-label={`${movie.title} details`}
      onWheel={handleWheel}
    >
      <button
        type='button'
        className='warp-details-backdrop'
        aria-label='Close details'
        onClick={onClose}
      />
      <article className='warp-details-card'>
        <button
          type='button'
          className='warp-details-close'
          aria-label='Close details'
          onClick={onClose}
        >
          Close
        </button>
        <div className='warp-details-poster'>
          <img
            src={movie.posterUrl}
            alt=''
            onError={(event) => {
              if (!movie.fallbackPosterUrl) return
              if (event.currentTarget.src.endsWith(movie.fallbackPosterUrl))
                return
              event.currentTarget.src = movie.fallbackPosterUrl
            }}
          />
        </div>
        <div className='warp-details-copy'>
          <p className='warp-details-kicker'>{formatMovieMeta(movie)}</p>
          <h2>{movie.title}</h2>
          {movie.tagline ? (
            <p className='warp-details-tagline'>{movie.tagline}</p>
          ) : null}
          <p className='warp-details-overview'>
            {movie.overview || 'No overview available yet.'}
          </p>
          <div className='warp-details-genres'>
            {movie.genres.map((genre) => (
              <button
                type='button'
                key={genre}
                onClick={() => onSelectGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
          <p className='warp-details-origin'>{movie.countries || 'Cinema'}</p>
        </div>
      </article>
    </section>
  )
}
