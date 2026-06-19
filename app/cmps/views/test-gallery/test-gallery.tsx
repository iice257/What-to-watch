import {
  type CSSProperties,
  type MutableRefObject,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cn } from '../../../utils/tw'

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
  backdropUrl: string
}

type ViewMode = 'index' | 'gallery'
type LoadState = 'loading' | 'ready' | 'error'

const DATASET_SIZE = 50

const getText = (raw: RawMovie, key: string) => {
  const value = raw[key]
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const getNumber = (raw: RawMovie, key: string) => {
  const value = Number(raw[key])
  return Number.isFinite(value) ? value : 0
}

const splitList = (value: string, maxItems = 3) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)

const mapMovie = (raw: RawMovie, index: number): TestMovie => {
  const posterUrl = `/media/single/${index}.jpg`
  const rating = getNumber(raw, 'vote_average').toFixed(1)
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
    rating,
    countries: splitList(getText(raw, 'production_countries'), 2).join(', '),
    posterUrl,
    backdropUrl: posterUrl,
  }
}

const sortMoviesForIndex = (movies: TestMovie[]) =>
  [...movies].sort((movieA, movieB) => {
    const yearSort = movieB.year.localeCompare(movieA.year)
    return yearSort || movieA.rank - movieB.rank
  })

const groupMoviesByYear = (movies: TestMovie[]) =>
  movies.reduce<Record<string, TestMovie[]>>((groups, movie) => {
    const year = movie.year || '----'
    groups[year] = [...(groups[year] ?? []), movie]
    return groups
  }, {})

export const TestGalleryApp = () => {
  const [movies, setMovies] = useState<TestMovie[]>([])
  const [activeMovieId, setActiveMovieId] = useState<string | null>(null)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [mode, setMode] = useState<ViewMode>('index')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const galleryRefs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    let cancelled = false

    setLoadState('loading')
    fetch('/json/0.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load movie data (${response.status})`)
        }
        return response.json() as Promise<RawMovie[]>
      })
      .then((data) => {
        if (cancelled) return
        const previewMovies = data
          .slice(0, DATASET_SIZE)
          .map((movie, index) => mapMovie(movie, index))
        setMovies(previewMovies)
        setActiveMovieId(sortMoviesForIndex(previewMovies)[0]?.id ?? null)
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

  const visibleMovies = useMemo(
    () => {
      const filteredMovies = activeGenre
        ? movies.filter((movie) => movie.genres.includes(activeGenre))
        : movies
      return sortMoviesForIndex(filteredMovies)
    },
    [activeGenre, movies],
  )

  useEffect(() => {
    if (
      visibleMovies.length > 0 &&
      !visibleMovies.some((movie) => movie.id === activeMovieId)
    ) {
      setActiveMovieId(visibleMovies[0].id)
    }
  }, [activeMovieId, visibleMovies])

  const activeMovie = useMemo(
    () =>
      visibleMovies.find((movie) => movie.id === activeMovieId) ??
      visibleMovies[0] ??
      null,
    [activeMovieId, visibleMovies],
  )

  const groupedMovies = useMemo(() => {
    const groups = groupMoviesByYear(visibleMovies)
    return Object.entries(groups).sort(([yearA], [yearB]) =>
      yearB.localeCompare(yearA),
    )
  }, [visibleMovies])

  const allGenres = useMemo(
    () => Array.from(new Set(movies.flatMap((movie) => movie.genres))).sort(),
    [movies],
  )

  const selectMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
  }, [])

  const moveActiveMovie = useCallback(
    (direction: -1 | 1) => {
      if (visibleMovies.length === 0) return
      const activeIndex = Math.max(
        0,
        visibleMovies.findIndex((movie) => movie.id === activeMovieId),
      )
      const nextIndex =
        (activeIndex + direction + visibleMovies.length) % visibleMovies.length
      setActiveMovieId(visibleMovies[nextIndex].id)
    },
    [activeMovieId, visibleMovies],
  )

  useEffect(() => {
    if (mode !== 'gallery' || !activeMovie) return
    galleryRefs.current.get(activeMovie.id)?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    })
  }, [activeMovie, mode])

  const setBackdropFallback = (
    event: SyntheticEvent<HTMLImageElement>,
  ) => {
    if (!activeMovie) return
    const image = event.currentTarget
    if (image.src.endsWith(activeMovie.posterUrl)) return
    image.src = activeMovie.posterUrl
  }

  return (
    <main className="phantom-test-shell relative min-h-dvh overflow-hidden bg-[#050505] text-[#f6f0e8]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {activeMovie ? (
          <>
            <img
              key={`${activeMovie.id}-backdrop`}
              src={activeMovie.backdropUrl}
              alt=""
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.18] saturate-[0.78]"
              onError={setBackdropFallback}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_44%,transparent_0,rgba(5,5,5,0.28)_24rem,rgba(5,5,5,0.92)_58rem),linear-gradient(90deg,rgba(5,5,5,0.94),rgba(5,5,5,0.54)_52%,rgba(5,5,5,0.86))]" />
            <figure
              className={cn(
                'phantom-floating-poster absolute right-[4vw] top-[13vh] hidden h-[68vh] max-h-[700px] w-[28vw] max-w-[390px] overflow-hidden rounded-[3px] border border-white/12 bg-white/[0.03] shadow-[0_38px_140px_rgba(0,0,0,0.74)]',
                mode === 'index' ? 'md:block' : 'md:hidden',
              )}
              style={
                {
                  '--poster-tilt': `${(activeMovie.rank % 5) - 2}deg`,
                } as CSSProperties
              }
            >
              <img
                key={`${activeMovie.id}-poster`}
                src={activeMovie.posterUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </figure>
          </>
        ) : null}
      </div>

      <header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-5 py-5 text-[0.68rem] uppercase tracking-[0.2em] text-white/70 md:px-8">
        <a href="/" className="font-semibold text-white">
          What to Watch
        </a>
        <div className="hidden items-center gap-4 sm:flex">
          <span>Prototype</span>
          <span>{DATASET_SIZE} movie preview</span>
        </div>
      </header>

      <section className="relative z-10 flex h-dvh min-h-0 flex-col px-5 pb-24 pt-24 md:px-8">
        <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(0,56vw)_minmax(260px,1fr)]">
          {mode === 'index' ? (
            <MovieIndex
              activeMovieId={activeMovie?.id ?? null}
              groupedMovies={groupedMovies}
              loadState={loadState}
              errorMessage={errorMessage}
              onSelectMovie={selectMovie}
            />
          ) : (
            <MovieCarousel
              activeMovieId={activeMovie?.id ?? null}
              movies={visibleMovies}
              galleryRefs={galleryRefs}
              onSelectMovie={selectMovie}
            />
          )}

          {mode === 'gallery' ? (
            <ActiveMoviePanel
              activeMovie={activeMovie}
              activeGenre={activeGenre}
              onGenreSelect={(genre) => setActiveGenre(genre)}
            />
          ) : (
            <div className="hidden lg:block" aria-hidden="true" />
          )}
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-[#050505] via-[#050505]/82 to-transparent" />

      <div className="fixed bottom-5 left-5 z-30 flex items-center gap-2 md:left-8">
        <ModeButton
          active={mode === 'index'}
          label="Index"
          onClick={() => setMode('index')}
        />
        <ModeButton
          active={mode === 'gallery'}
          label="Gallery"
          onClick={() => setMode('gallery')}
        />
      </div>

      <div className="-translate-x-1/2 fixed bottom-5 left-1/2 z-30 hidden items-center gap-2 sm:flex">
        <button
          type="button"
          className="phantom-pill"
          onClick={() => moveActiveMovie(-1)}
        >
          Prev
        </button>
        <button
          type="button"
          className="phantom-pill"
          onClick={() => moveActiveMovie(1)}
        >
          Next
        </button>
      </div>

      <div className="fixed bottom-5 right-5 z-30 md:right-8">
        <button
          type="button"
          className="phantom-pill"
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((isOpen) => !isOpen)}
        >
          Filter {activeGenre ? `: ${activeGenre}` : ''}
        </button>
        {filterOpen ? (
          <div className="absolute bottom-12 right-0 w-[min(20rem,calc(100vw-2.5rem))] rounded-sm border border-white/12 bg-[#080808]/95 p-3 shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              className={cn(
                'mb-2 w-full rounded-[2px] px-3 py-2 text-left text-xs uppercase tracking-[0.14em]',
                !activeGenre ? 'bg-white text-black' : 'bg-white/5 text-white/70',
              )}
              onClick={() => setActiveGenre(null)}
            >
              All movies
            </button>
            <div className="grid grid-cols-2 gap-2">
              {allGenres.map((genre) => (
                <button
                  type="button"
                  key={genre}
                  className={cn(
                    'rounded-[2px] border px-3 py-2 text-left text-xs text-white/75 transition hover:text-white',
                    activeGenre === genre
                      ? 'border-white bg-white text-black hover:text-black'
                      : 'border-white/10 bg-white/[0.035] hover:border-white/30',
                  )}
                  onClick={() => setActiveGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

type MovieIndexProps = {
  activeMovieId: string | null
  groupedMovies: [string, TestMovie[]][]
  loadState: LoadState
  errorMessage: string
  onSelectMovie: (movie: TestMovie) => void
}

const MovieIndex = ({
  activeMovieId,
  groupedMovies,
  loadState,
  errorMessage,
  onSelectMovie,
}: MovieIndexProps) => (
  <div className="phantom-index-scroll min-h-0 overflow-y-auto pr-1 lg:pr-8">
    <div className="mb-8 flex items-end justify-between gap-5 border-white/12 border-b pb-4">
      <div>
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/45">
          Index view
        </p>
        <h1 className="mt-2 text-5xl leading-none tracking-[-0.02em] md:text-7xl lg:text-8xl">
          All movies
        </h1>
      </div>
      <p className="text-right text-xs uppercase tracking-[0.16em] text-white/45">
        {loadState === 'ready'
          ? `${groupedMovies.reduce((total, [, movies]) => total + movies.length, 0)} films`
          : loadState}
      </p>
    </div>

    {loadState === 'error' ? (
      <p className="max-w-xl text-sm text-white/60">{errorMessage}</p>
    ) : null}

    {loadState === 'loading' ? (
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse rounded-[2px] bg-white/[0.04]"
          />
        ))}
      </div>
    ) : null}

    <div className="space-y-10">
      {groupedMovies.map(([year, movies]) => (
        <section
          key={year}
          className="grid gap-4 border-white/10 border-t pt-4 sm:grid-cols-[5rem_1fr]"
        >
          <h2 className="text-sm uppercase tracking-[0.18em] text-white/50">
            {year}
          </h2>
          <div className="divide-y divide-white/10">
            {movies.map((movie) => (
              <button
                type="button"
                key={movie.id}
                className={cn(
                  'phantom-index-row group grid w-full items-center gap-4 py-3 text-left transition duration-200',
                  activeMovieId === movie.id
                    ? 'text-white'
                    : 'text-white/52 hover:text-white',
                )}
                onClick={() => onSelectMovie(movie)}
                onFocus={() => onSelectMovie(movie)}
                onMouseEnter={() => onSelectMovie(movie)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[clamp(1.12rem,2.18vw,2rem)] leading-[1.04] tracking-[-0.035em]">
                    {movie.title}
                  </span>
                  <span className="mt-1 block truncate text-xs uppercase tracking-[0.16em] text-white/35 group-hover:text-white/55">
                    {movie.tagline || movie.overview}
                  </span>
                </span>
                <span className="hidden min-w-0 flex-wrap gap-1.5 md:flex">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-white/44"
                    >
                      {genre}
                    </span>
                  ))}
                </span>
                <span className="justify-self-end text-xs uppercase tracking-[0.16em] text-white/42">
                  {movie.rating} / {movie.runtime}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
)

type MovieCarouselProps = {
  activeMovieId: string | null
  movies: TestMovie[]
  galleryRefs: MutableRefObject<Map<string, HTMLButtonElement>>
  onSelectMovie: (movie: TestMovie) => void
}

const MovieCarousel = ({
  activeMovieId,
  movies,
  galleryRefs,
  onSelectMovie,
}: MovieCarouselProps) => (
  <div className="min-w-0 self-center overflow-hidden">
    <div className="mb-8 max-w-4xl">
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/45">
        Poster carousel
      </p>
      <h1 className="mt-2 text-5xl leading-none tracking-[-0.045em] md:text-7xl lg:text-8xl">
        Pick by sight
      </h1>
    </div>

    <div
      className="phantom-index-scroll flex snap-x gap-4 overflow-x-auto pb-8"
      onWheel={(event) => {
        event.currentTarget.scrollLeft += event.deltaY
      }}
    >
      {movies.map((movie) => {
        const isActive = activeMovieId === movie.id
        return (
          <button
            type="button"
            key={movie.id}
            ref={(node) => {
              if (node) {
                galleryRefs.current.set(movie.id, node)
              } else {
                galleryRefs.current.delete(movie.id)
              }
            }}
            className={cn(
              'phantom-gallery-card relative h-[54vh] min-h-[360px] w-[min(74vw,19rem)] shrink-0 snap-center overflow-hidden rounded-[4px] border bg-white/[0.035] text-left transition duration-300',
              isActive
                ? 'scale-100 border-white/40 opacity-100'
                : 'scale-[0.88] border-white/10 opacity-38 hover:opacity-80',
            )}
            onClick={() => onSelectMovie(movie)}
            onFocus={() => onSelectMovie(movie)}
            onMouseEnter={() => onSelectMovie(movie)}
          >
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/86 to-transparent p-4">
              <span className="block text-2xl leading-none tracking-[-0.045em] text-white">
                {movie.title}
              </span>
              <span className="mt-2 block text-xs uppercase tracking-[0.16em] text-white/58">
                {movie.year} / {movie.rating}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  </div>
)

type ActiveMoviePanelProps = {
  activeMovie: TestMovie | null
  activeGenre: string | null
  onGenreSelect: (genre: string) => void
}

const ActiveMoviePanel = ({
  activeMovie,
  activeGenre,
  onGenreSelect,
}: ActiveMoviePanelProps) => (
  <aside className="hidden min-h-0 flex-col justify-end pb-10 lg:flex">
    {activeMovie ? (
      <div className="max-w-md">
        <p className="mb-4 text-[0.68rem] uppercase tracking-[0.2em] text-white/42">
          #{String(activeMovie.rank).padStart(2, '0')} / {activeMovie.year} /{' '}
          {activeMovie.runtime}
        </p>
        <h2 className="text-5xl leading-[0.9] tracking-[-0.055em]">
          {activeMovie.title}
        </h2>
        <p className="mt-5 line-clamp-6 text-sm leading-6 text-white/62">
          {activeMovie.overview}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {activeMovie.genres.map((genre) => (
            <button
              type="button"
              key={genre}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[0.64rem] uppercase tracking-[0.14em] transition',
                activeGenre === genre
                  ? 'border-white bg-white text-black'
                  : 'border-white/12 bg-white/[0.035] text-white/58 hover:border-white/35 hover:text-white',
              )}
              onClick={() => onGenreSelect(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-white/34">
          {activeMovie.countries || 'TMDB'} / Rating {activeMovie.rating}
        </p>
      </div>
    ) : null}
  </aside>
)

type ModeButtonProps = {
  active: boolean
  label: string
  onClick: () => void
}

const ModeButton = ({ active, label, onClick }: ModeButtonProps) => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      'phantom-pill',
      active ? 'bg-white text-black' : 'text-white/70 hover:text-white',
    )}
    onClick={onClick}
  >
    {label}
  </button>
)
