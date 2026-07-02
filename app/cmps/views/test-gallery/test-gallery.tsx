import { Search, SlidersHorizontal, X } from 'lucide-react'
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
  runtimeMinutes: number | null
  rating: string
  ratingValue: number | null
  countries: string
  posterUrl: string
  fallbackPosterUrl: string
}

type ViewMode = 'wall' | 'list' | 'genres'
type ListGrouping = 'year' | 'alpha'
type LoadState = 'loading' | 'ready' | 'error'
type RuntimeFilter = 'under90' | 'under120' | 'long'
type MoodFilter = 'fast' | 'dark' | 'funny' | 'romantic' | 'weird' | 'highRated'
type GenreSummary = {
  count: number
  genre: string
}
type DecisionFilterResult = {
  broadened: boolean
  movies: TestMovie[]
  strictCount: number
}

const DATASET_FILE_COUNT = 5
const INDEX_CATALOG_COUNT = 57294
const LIST_WINDOW_SIZE = 10000
const GALLERY_WINDOW_SIZE = 750
const MIN_DECISION_FILTER_RESULTS = 24
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342'
const RUNTIME_FILTERS: Array<{
  id: RuntimeFilter
  label: string
  test: (runtimeMinutes: number | null) => boolean
}> = [
  {
    id: 'under90',
    label: 'Under 90 min',
    test: (runtimeMinutes) => Boolean(runtimeMinutes && runtimeMinutes < 90),
  },
  {
    id: 'under120',
    label: 'Under 2 hr',
    test: (runtimeMinutes) => Boolean(runtimeMinutes && runtimeMinutes < 120),
  },
  {
    id: 'long',
    label: 'Long watch',
    test: (runtimeMinutes) => Boolean(runtimeMinutes && runtimeMinutes >= 150),
  },
]
const MOOD_FILTERS: Array<{
  genres?: string[]
  id: MoodFilter
  label: string
  test?: (movie: TestMovie) => boolean
}> = [
  {
    genres: ['Action', 'Adventure', 'Thriller'],
    id: 'fast',
    label: 'Fast',
  },
  {
    genres: ['Crime', 'Horror', 'Mystery', 'Thriller', 'War'],
    id: 'dark',
    label: 'Dark',
  },
  {
    genres: ['Animation', 'Comedy', 'Family'],
    id: 'funny',
    label: 'Funny',
  },
  {
    genres: ['Romance'],
    id: 'romantic',
    label: 'Romantic',
  },
  {
    genres: ['Fantasy', 'Horror', 'Science Fiction'],
    id: 'weird',
    label: 'Weird',
  },
  {
    id: 'highRated',
    label: 'High-rated',
    test: (movie) => Boolean(movie.ratingValue && movie.ratingValue >= 7.5),
  },
]

const getText = (raw: RawMovie, key: string) => {
  const value = raw[key]
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const getPositiveNumber = (raw: RawMovie, key: string) => {
  const value = Number(raw[key])
  return Number.isFinite(value) && value > 0 ? value : null
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

const escapePosterText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const getPosterTitleLines = (title: string) => {
  const words = title.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []

  words.forEach((word) => {
    const currentLine = lines.at(-1)
    if (!currentLine || `${currentLine} ${word}`.length > 13) {
      if (lines.length < 5) lines.push(word)
      return
    }

    lines[lines.length - 1] = `${currentLine} ${word}`
  })

  return (lines.length ? lines : ['Untitled']).slice(0, 5)
}

const getFallbackPosterUrl = (movie: {
  rank: number
  title: string
  year: string
}) => {
  const titleLines = getPosterTitleLines(movie.title)
    .map((line, index) => {
      const y = 166 + index * 43
      return `<text x="38" y="${y}" fill="white" font-family="Arial, sans-serif" font-size="39" font-weight="900" letter-spacing="-1">${escapePosterText(line.toUpperCase())}</text>`
    })
    .join('')
  const year = escapePosterText(
    movie.year && movie.year !== '----' ? movie.year : 'Cinema',
  )
  const hue = (movie.rank * 47) % 360
  const accentHue = (hue + 38) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 342 513"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 24% 13%)"/><stop offset=".58" stop-color="#070707"/><stop offset="1" stop-color="hsl(${accentHue} 48% 18%)"/></linearGradient><radialGradient id="r" cx=".28" cy=".18" r=".78"><stop offset="0" stop-color="hsl(${accentHue} 62% 54%)" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="342" height="513" fill="url(#g)"/><rect width="342" height="513" fill="url(#r)"/><rect x="22" y="22" width="298" height="469" rx="24" fill="none" stroke="white" stroke-opacity=".16"/><text x="38" y="74" fill="white" fill-opacity=".55" font-family="Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="4">${year}</text>${titleLines}<circle cx="68" cy="438" r="20" fill="white" fill-opacity=".88"/><circle cx="118" cy="438" r="20" fill="white" fill-opacity=".18"/><circle cx="168" cy="438" r="20" fill="white" fill-opacity=".18"/></svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const formatRuntime = (runtime: string, runtimeMinutes: number | null) => {
  if (runtimeMinutes) {
    const hours = Math.floor(runtimeMinutes / 60)
    const minutes = runtimeMinutes % 60
    if (!hours) return `${minutes}m`
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`
  }

  const value = runtime.trim()
  if (!value || value === '0' || value === '0:00' || value === '0m') {
    return 'Runtime TBA'
  }
  return value
}

export const formatMovieMeta = (movie: TestMovie) =>
  `Year: ${
    movie.year && movie.year !== '----' ? movie.year : 'Year TBA'
  } / Rating: ${
    movie.ratingValue ? movie.rating : 'Unrated'
  } / Runtime: ${formatRuntime(movie.runtime, movie.runtimeMinutes)}`

const hasLatinLeadingTitle = (movie: TestMovie) =>
  /^[A-Za-z]/.test(movie.title.trim())

type MoviePosterProps = {
  movie: TestMovie
  loading?: 'eager' | 'lazy'
}

const MoviePoster = ({ movie, loading = 'lazy' }: MoviePosterProps) => {
  const [isUsingFallback, setIsUsingFallback] = useState(
    movie.posterUrl === movie.fallbackPosterUrl,
  )

  useEffect(() => {
    setIsUsingFallback(movie.posterUrl === movie.fallbackPosterUrl)
  }, [movie.fallbackPosterUrl, movie.posterUrl])

  return (
    <img
      src={isUsingFallback ? movie.fallbackPosterUrl : movie.posterUrl}
      alt=''
      loading={loading}
      data-poster-state={isUsingFallback ? 'fallback' : 'remote'}
      onError={() => setIsUsingFallback(true)}
    />
  )
}

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

export const filterMoviesByTitleSearch = (
  movies: TestMovie[],
  searchQuery: string,
) => {
  const query = searchQuery.trim().toLocaleLowerCase()
  if (!query) return movies

  return movies.filter((movie) =>
    movie.title.toLocaleLowerCase().includes(query),
  )
}

const movieHasAnyGenre = (movie: TestMovie, genres: string[]) => {
  const movieGenres = new Set(movie.genres)
  return genres.some((genre) => movieGenres.has(genre))
}

const matchesRuntimeFilter = (
  movie: TestMovie,
  runtimeFilter: RuntimeFilter | null,
) => {
  if (!runtimeFilter) return true
  return (
    RUNTIME_FILTERS.find((filter) => filter.id === runtimeFilter)?.test(
      movie.runtimeMinutes,
    ) ?? true
  )
}

const matchesAnyMoodFilter = (
  movie: TestMovie,
  selectedMoodFilters: MoodFilter[],
) => {
  if (!selectedMoodFilters.length) return true

  return selectedMoodFilters.some((filterId) => {
    const filter = MOOD_FILTERS.find((item) => item.id === filterId)
    if (!filter) return false
    if (filter.test?.(movie)) return true
    return filter.genres ? movieHasAnyGenre(movie, filter.genres) : false
  })
}

const matchesAnyDecisionFilter = (
  movie: TestMovie,
  selectedMoodFilters: MoodFilter[],
  runtimeFilter: RuntimeFilter | null,
) =>
  (runtimeFilter ? matchesRuntimeFilter(movie, runtimeFilter) : false) ||
  (selectedMoodFilters.length
    ? matchesAnyMoodFilter(movie, selectedMoodFilters)
    : false)

export const filterMoviesByDecisionFilters = (
  movies: TestMovie[],
  selectedMoodFilters: MoodFilter[],
  runtimeFilter: RuntimeFilter | null,
): DecisionFilterResult => {
  const hasFilters = Boolean(selectedMoodFilters.length || runtimeFilter)
  if (!hasFilters) {
    return { broadened: false, movies, strictCount: movies.length }
  }

  const strictMovies = movies.filter(
    (movie) =>
      matchesRuntimeFilter(movie, runtimeFilter) &&
      matchesAnyMoodFilter(movie, selectedMoodFilters),
  )

  if (strictMovies.length >= MIN_DECISION_FILTER_RESULTS) {
    return {
      broadened: false,
      movies: strictMovies,
      strictCount: strictMovies.length,
    }
  }

  const broadenedMovies = movies.filter((movie) =>
    matchesAnyDecisionFilter(movie, selectedMoodFilters, runtimeFilter),
  )

  return {
    broadened: broadenedMovies.length > strictMovies.length,
    movies: broadenedMovies.length ? broadenedMovies : strictMovies,
    strictCount: strictMovies.length,
  }
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
  const rating = getPositiveNumber(raw, 'vote_average')
  const runtimeMinutes = getPositiveNumber(raw, 'runtime_minutes')
  const year = getText(raw, 'release_year') || '----'
  const rawId = getText(raw, 'id')
  const posterPath = getText(raw, 'poster_path')
  const title = getText(raw, 'title') || `Untitled ${index + 1}`
  const fallbackPosterUrl = getFallbackPosterUrl({
    rank: index + 1,
    title,
    year,
  })

  return {
    id: rawId ? `${index}-${rawId}` : String(index),
    rank: index + 1,
    title,
    tagline: getText(raw, 'tagline'),
    overview: getText(raw, 'overview'),
    genres: splitList(getText(raw, 'genres')),
    year,
    runtime: getText(raw, 'time_str') || '',
    runtimeMinutes,
    rating: rating ? rating.toFixed(1) : '',
    ratingValue: rating,
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
  const [selectedMoodFilters, setSelectedMoodFilters] = useState<MoodFilter[]>(
    [],
  )
  const [selectedRuntimeFilter, setSelectedRuntimeFilter] =
    useState<RuntimeFilter | null>(null)
  const [listSearchQuery, setListSearchQuery] = useState('')
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

  const genreFilteredMovies = useMemo(
    () => filterMoviesByGenres(movies, selectedGenres),
    [movies, selectedGenres],
  )

  const decisionFilterResult = useMemo(
    () =>
      filterMoviesByDecisionFilters(
        genreFilteredMovies,
        selectedMoodFilters,
        selectedRuntimeFilter,
      ),
    [genreFilteredMovies, selectedMoodFilters, selectedRuntimeFilter],
  )

  const filteredMovies = decisionFilterResult.movies
  const selectedFilterCount =
    selectedGenres.length +
    selectedMoodFilters.length +
    (selectedRuntimeFilter ? 1 : 0)

  const visibleMovies = useMemo(
    () => getGalleryWindow(filteredMovies, selectedGenres),
    [filteredMovies, selectedGenres],
  )

  useEffect(() => {
    if (mode !== 'wall') return
    if (
      visibleMovies.length > 0 &&
      !visibleMovies.some((movie) => movie.id === activeMovieId)
    ) {
      setActiveMovieId(visibleMovies[0].id)
    }
  }, [activeMovieId, mode, visibleMovies])

  const searchableListMovies = useMemo(
    () => filterMoviesByTitleSearch(filteredMovies, listSearchQuery),
    [filteredMovies, listSearchQuery],
  )

  const listMovies = useMemo(
    () =>
      sortMoviesForList(searchableListMovies, listGrouping).slice(
        0,
        LIST_WINDOW_SIZE,
      ),
    [listGrouping, searchableListMovies],
  )

  useEffect(() => {
    if (mode !== 'list' || !listMovies.length) return
    if (!listMovies.some((movie) => movie.id === activeMovieId)) {
      setActiveMovieId(listMovies[0].id)
    }
  }, [activeMovieId, listMovies, mode])

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
  const clearAllFilters = useCallback(() => {
    setSelectedGenres([])
    setSelectedMoodFilters([])
    setSelectedRuntimeFilter(null)
  }, [])

  const handleSelectMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
  }, [])

  const toggleMoodFilter = useCallback((moodFilter: MoodFilter) => {
    setSelectedMoodFilters((currentFilters) =>
      currentFilters.includes(moodFilter)
        ? currentFilters.filter((filter) => filter !== moodFilter)
        : [...currentFilters, moodFilter],
    )
  }, [])

  const toggleRuntimeFilter = useCallback((runtimeFilter: RuntimeFilter) => {
    setSelectedRuntimeFilter((currentFilter) =>
      currentFilter === runtimeFilter ? null : runtimeFilter,
    )
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
          searchQuery={listSearchQuery}
          searchResultCount={searchableListMovies.length}
          totalMovieCount={INDEX_CATALOG_COUNT}
          onGroupingChange={setListGrouping}
          onOpenMovie={handleOpenMovie}
          onPickRandomMovie={handlePickRandomMovie}
          onSearchQueryChange={setListSearchQuery}
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
        selectedFilterCount={selectedFilterCount}
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
          clearAllFilters()
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
        {filterOpen && selectedFilterCount ? (
          <button
            type='button'
            className='warp-filter-reset'
            aria-label='Reset filters'
            onClick={clearAllFilters}
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
          <SlidersHorizontal className='warp-filter-icon' aria-hidden='true' />
          <span className='warp-filter-label'>Filter</span>
          {selectedFilterCount ? (
            <span className='warp-filter-count'>{selectedFilterCount}</span>
          ) : null}
        </button>
      </div>

      {filterOpen ? (
        <FilterPanel
          broadened={decisionFilterResult.broadened}
          genres={genreSummaries}
          resultCount={filteredMovies.length}
          runtimeFilter={selectedRuntimeFilter}
          selectedGenres={selectedGenres}
          selectedMoodFilters={selectedMoodFilters}
          strictResultCount={decisionFilterResult.strictCount}
          onClear={clearAllFilters}
          onToggleRuntimeFilter={toggleRuntimeFilter}
          onToggleGenre={toggleGenre}
          onToggleMoodFilter={toggleMoodFilter}
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
  searchQuery: string
  searchResultCount: number
  totalMovieCount: number
  onGroupingChange: (grouping: ListGrouping) => void
  onOpenMovie: (movie: TestMovie) => void
  onPickRandomMovie: (movie: TestMovie) => void
  onSearchQueryChange: (searchQuery: string) => void
  onSelectMovie: (movie: TestMovie) => void
}

const WarpList = ({
  activeMovieId,
  errorMessage,
  grouping,
  loadState,
  movies,
  searchQuery,
  searchResultCount,
  totalMovieCount,
  onGroupingChange,
  onOpenMovie,
  onPickRandomMovie,
  onSearchQueryChange,
  onSelectMovie,
}: WarpListProps) => {
  const [randomPulseId, setRandomPulseId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pulseTimerRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

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

  useEffect(() => {
    if (!isSearchOpen) return
    searchInputRef.current?.focus()
  }, [isSearchOpen])

  const clearSearch = () => {
    onSearchQueryChange('')
    searchInputRef.current?.focus()
  }

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
            {loadState !== 'ready'
              ? loadState
              : searchQuery.trim()
                ? `${searchResultCount.toLocaleString()} title matches`
                : `${totalMovieCount.toLocaleString()} movies in index`}
          </p>
        </div>
        <form
          className={cn(
            'warp-list-search',
            (isSearchOpen || searchQuery) && 'is-open',
          )}
          onSubmit={(event) => event.preventDefault()}
        >
          <Search aria-hidden='true' size={15} strokeWidth={2.6} />
          <label className='sr-only' htmlFor='warp-list-search'>
            Search movie titles
          </label>
          <input
            ref={searchInputRef}
            id='warp-list-search'
            type='search'
            value={searchQuery}
            placeholder='Search titles'
            aria-label='Search movie titles'
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              if (searchQuery) {
                onSearchQueryChange('')
                return
              }
              setIsSearchOpen(false)
            }}
          />
          {searchQuery ? (
            <button
              type='button'
              className='warp-list-search-clear'
              aria-label='Clear title search'
              onClick={clearSearch}
            >
              <X aria-hidden='true' size={14} strokeWidth={3} />
            </button>
          ) : null}
        </form>
        <div className='warp-list-tools'>
          <button
            type='button'
            className='warp-list-search-toggle'
            aria-label={
              isSearchOpen ? 'Close title search' : 'Open title search'
            }
            aria-expanded={isSearchOpen}
            onClick={() => setIsSearchOpen((isOpen) => !isOpen)}
          >
            <Search aria-hidden='true' size={17} strokeWidth={2.7} />
          </button>
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
        </div>
      </header>

      {loadState === 'error' ? (
        <p className='warp-list-error'>{errorMessage}</p>
      ) : null}

      {loadState === 'ready' && !movies.length ? (
        <div className='warp-list-empty'>
          <h2>No title matches</h2>
          <p>
            Try a shorter title search or clear the current filters to widen the
            index.
          </p>
          {searchQuery ? (
            <button type='button' onClick={clearSearch}>
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
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
                      <MoviePoster movie={movie} />
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
      )}
    </section>
  )
}

type WarpChromeProps = {
  aboutOpen: boolean
  activeMovie: TestMovie | null
  mode: ViewMode
  movieCount: number
  selectedFilterCount: number
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
  selectedFilterCount,
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
        {activeMovie
          ? `${formatMovieMeta(activeMovie)} / ${movieCount} indexed`
          : `${movieCount} loading`}
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
        <span className='warp-mode-label'>Gallery</span>
      </button>
      <button
        type='button'
        aria-label='Movie index'
        aria-pressed={mode === 'list'}
        onClick={() => onModeChange('list')}
      >
        <span className='warp-list-icon' />
        <span className='warp-mode-label'>Index</span>
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
        {selectedFilterCount ? <span>{selectedFilterCount}</span> : null}
      </button>
    </nav>
  </>
)

type FilterPanelProps = {
  broadened: boolean
  genres: GenreSummary[]
  resultCount: number
  runtimeFilter: RuntimeFilter | null
  selectedGenres: string[]
  selectedMoodFilters: MoodFilter[]
  strictResultCount: number
  onClear: () => void
  onToggleRuntimeFilter: (runtimeFilter: RuntimeFilter) => void
  onToggleGenre: (genre: string) => void
  onToggleMoodFilter: (moodFilter: MoodFilter) => void
}

const FilterPanel = ({
  broadened,
  genres,
  resultCount,
  runtimeFilter,
  selectedGenres,
  selectedMoodFilters,
  strictResultCount,
  onClear,
  onToggleRuntimeFilter,
  onToggleGenre,
  onToggleMoodFilter,
}: FilterPanelProps) => (
  <aside className='warp-filter-panel'>
    <div className='warp-filter-panel-heading'>
      <p>Stack filters</p>
      <span>
        {resultCount} {broadened ? 'broadened' : 'matches'}
      </span>
    </div>
    <button
      type='button'
      className={cn(
        !selectedGenres.length &&
          !selectedMoodFilters.length &&
          !runtimeFilter &&
          'is-active',
      )}
      onClick={onClear}
    >
      All movies
    </button>
    {broadened ? (
      <p className='warp-filter-note'>
        Broadened from {strictResultCount} exact matches to keep the wall full.
      </p>
    ) : null}
    <div className='warp-filter-panel-section'>
      <p>Runtime</p>
      {RUNTIME_FILTERS.map((filter) => (
        <button
          type='button'
          className={cn(runtimeFilter === filter.id && 'is-active')}
          key={filter.id}
          aria-pressed={runtimeFilter === filter.id}
          onClick={() => onToggleRuntimeFilter(filter.id)}
        >
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
    <div className='warp-filter-panel-section'>
      <p>Mood</p>
      {MOOD_FILTERS.map((filter) => (
        <button
          type='button'
          className={cn(selectedMoodFilters.includes(filter.id) && 'is-active')}
          key={filter.id}
          aria-pressed={selectedMoodFilters.includes(filter.id)}
          onClick={() => onToggleMoodFilter(filter.id)}
        >
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
    <div className='warp-filter-panel-section'>
      <p>Genres</p>
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
    </div>
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
          <MoviePoster loading='eager' movie={movie} />
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
