import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Dices,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
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
type ContentFilter = 'all' | 'movies' | 'series'
type RuntimeFilter =
  | 'movie30to60'
  | 'movie90to120'
  | 'movie150to180'
  | 'movie210plus'
  | 'seriesUnder25'
  | 'series40plus'
  | 'seriesSingleSeason'
  | 'seriesBinge'
  | 'seriesLong'
  | 'seriesLongRun'
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
type PosterLoadState = 'loading' | 'loaded' | 'fallback'
type MotionPhase = 'enter' | 'exit'

const DATASET_FILE_COUNT = 5
const INDEX_CATALOG_COUNT = 57294
const LIST_WINDOW_SIZE = 10000
const GALLERY_WINDOW_SIZE = 1000
const MIN_DECISION_FILTER_RESULTS = 24
const DETAILS_EXPAND_DRAG_PX = 42
const DETAILS_CLOSE_DRAG_PX = 68
const EXIT_ANIMATION_MS = 220
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342'
const CONTENT_FILTERS: Array<{
  disabled?: boolean
  id: ContentFilter
  label: string
  meta?: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'movies', label: 'Movies' },
  { disabled: true, id: 'series', label: 'Series', meta: 'Coming soon' },
]
const MOVIE_RUNTIME_FILTERS: Array<{
  disabled?: boolean
  id: RuntimeFilter
  label: string
  test: (runtimeMinutes: number | null) => boolean
}> = [
  {
    id: 'movie30to60',
    label: '30 mins to 1 hr',
    test: (runtimeMinutes) =>
      Boolean(runtimeMinutes && runtimeMinutes >= 30 && runtimeMinutes <= 60),
  },
  {
    id: 'movie90to120',
    label: '1 hr 30 mins to 2 hrs',
    test: (runtimeMinutes) =>
      Boolean(runtimeMinutes && runtimeMinutes >= 90 && runtimeMinutes <= 120),
  },
  {
    id: 'movie150to180',
    label: '2 hr 30 mins to 3 hrs',
    test: (runtimeMinutes) =>
      Boolean(runtimeMinutes && runtimeMinutes >= 150 && runtimeMinutes <= 180),
  },
  {
    id: 'movie210plus',
    label: '3 hr 30 mins and longer',
    test: (runtimeMinutes) => Boolean(runtimeMinutes && runtimeMinutes >= 210),
  },
]
const SERIES_RUNTIME_FILTERS: Array<{
  disabled?: boolean
  id: RuntimeFilter
  label: string
  test: (runtimeMinutes: number | null) => boolean
}> = [
  {
    disabled: true,
    id: 'seriesUnder25',
    label: 'Under 25 min / ep.',
    test: () => false,
  },
  {
    disabled: true,
    id: 'series40plus',
    label: '40 min+ / ep.',
    test: () => false,
  },
  {
    disabled: true,
    id: 'seriesSingleSeason',
    label: 'Single season',
    test: () => false,
  },
  {
    disabled: true,
    id: 'seriesBinge',
    label: 'Binge (2-3 seasons)',
    test: () => false,
  },
  {
    disabled: true,
    id: 'seriesLong',
    label: 'Long series (3+ seasons)',
    test: () => false,
  },
  {
    disabled: true,
    id: 'seriesLongRun',
    label: 'Long-run episodic',
    test: () => false,
  },
]
const RUNTIME_FILTERS = [...MOVIE_RUNTIME_FILTERS, ...SERIES_RUNTIME_FILTERS]
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

const escapeSvgText = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })

const getFallbackPosterUrl = (rank: number, title: string, year: string) => {
  const hue = Math.round(seededRandom(rank) * 360)
  const accentHue = (hue + 42) % 360
  const displayTitle = escapeSvgText(title || 'Untitled').slice(0, 72)
  const displayYear = escapeSvgText(year && year !== '----' ? year : 'Movie')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 342 513"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="hsl(${hue} 38% 26%)"/><stop offset=".52" stop-color="#111"/><stop offset="1" stop-color="hsl(${accentHue} 42% 18%)"/></linearGradient></defs><rect width="342" height="513" fill="url(#g)"/><circle cx="272" cy="88" r="88" fill="rgba(255,255,255,.13)"/><rect x="28" y="32" width="286" height="449" rx="22" fill="rgba(0,0,0,.18)" stroke="rgba(255,255,255,.22)"/><text x="36" y="378" fill="rgba(255,255,255,.9)" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900">${displayTitle}</text><text x="36" y="424" fill="rgba(255,255,255,.78)" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" letter-spacing="3">${displayYear} | #${rank}</text></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const formatRuntime = (runtime: string, runtimeMinutes: number | null) => {
  if (runtimeMinutes) {
    const hours = Math.floor(runtimeMinutes / 60)
    const minutes = runtimeMinutes % 60
    return `${hours}:${String(minutes).padStart(2, '0')}`
  }

  const value = runtime.trim()
  if (!value || value === '0' || value === '0:00' || value === '0m') {
    return '-'
  }
  return value
}

export const formatMovieMeta = (movie: TestMovie) =>
  `Year: ${movie.year && movie.year !== '----' ? movie.year : '-'} | Rating: ${
    movie.ratingValue ? movie.rating : '-'
  } | Hour: ${formatRuntime(movie.runtime, movie.runtimeMinutes)}`

const hasLatinLeadingTitle = (movie: TestMovie) =>
  /^[A-Za-z]/.test(movie.title.trim())

type MoviePosterProps = {
  movie: TestMovie
  loading?: 'eager' | 'lazy'
}

const MoviePoster = ({ movie, loading = 'lazy' }: MoviePosterProps) => {
  const hasRemotePoster = movie.posterUrl !== movie.fallbackPosterUrl
  const [posterSrc, setPosterSrc] = useState(movie.posterUrl)
  const [loadState, setLoadState] = useState<PosterLoadState>(
    hasRemotePoster ? 'loading' : 'fallback',
  )

  useEffect(() => {
    setPosterSrc(movie.posterUrl)
    setLoadState(hasRemotePoster ? 'loading' : 'fallback')
  }, [hasRemotePoster, movie.posterUrl])

  return (
    <span className='warp-poster-frame' data-poster-state={loadState}>
      <span className='warp-poster-placeholder'>
        <span>{movie.title}</span>
      </span>
      <img
        src={posterSrc}
        alt=''
        loading={loading}
        onError={() => {
          if (posterSrc === movie.fallbackPosterUrl) {
            setLoadState('fallback')
            return
          }
          setPosterSrc(movie.fallbackPosterUrl)
          setLoadState('fallback')
        }}
        onLoad={() => setLoadState(hasRemotePoster ? 'loaded' : 'fallback')}
      />
    </span>
  )
}

const useExitPresence = <T,>(
  isOpen: boolean,
  value: T | null = null,
  exitMs = EXIT_ANIMATION_MS,
) => {
  const [isPresent, setIsPresent] = useState(isOpen)
  const [motionPhase, setMotionPhase] = useState<MotionPhase>(
    isOpen ? 'enter' : 'exit',
  )
  const [presentValue, setPresentValue] = useState<T | null>(value)

  useEffect(() => {
    if (isOpen) {
      if (value !== null) setPresentValue(value)
      setIsPresent(true)
      setMotionPhase('enter')
      return
    }

    if (!isPresent) return

    setMotionPhase('exit')
    const timer = window.setTimeout(() => {
      setIsPresent(false)
      setPresentValue(null)
    }, exitMs)

    return () => window.clearTimeout(timer)
  }, [exitMs, isOpen, isPresent, value])

  return { isPresent, motionPhase, value: presentValue }
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

const getMovieListGroupKey = (movie: TestMovie, grouping: ListGrouping) => {
  if (grouping === 'alpha') {
    const letter = movie.title.charAt(0).toUpperCase() || '#'
    return /[A-Z]/.test(letter) ? letter : '#'
  }

  return movie.year || '----'
}

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
  const fallbackPosterUrl = getFallbackPosterUrl(index + 1, title, year)

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

let cachedMovieDataset: TestMovie[] | null = null
let movieDatasetPromise: Promise<TestMovie[]> | null = null

const loadMovieDataset = () => {
  if (cachedMovieDataset) return Promise.resolve(cachedMovieDataset)

  movieDatasetPromise ??= Promise.all(
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
      cachedMovieDataset = datasets
        .flat()
        .slice(0, LIST_WINDOW_SIZE)
        .map(mapMovie)
      return cachedMovieDataset
    })
    .catch((error: unknown) => {
      movieDatasetPromise = null
      throw error
    })

  return movieDatasetPromise
}

export const TestGalleryApp = () => {
  const [movies, setMovies] = useState<TestMovie[]>(cachedMovieDataset ?? [])
  const [mode, setMode] = useState<ViewMode>('wall')
  const [listGrouping, setListGrouping] = useState<ListGrouping>('year')
  const [activeMovieId, setActiveMovieId] = useState<string | null>(
    cachedMovieDataset?.[0]?.id ?? null,
  )
  const [detailsMovieId, setDetailsMovieId] = useState<string | null>(null)
  const [watchMovieId, setWatchMovieId] = useState<string | null>(null)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedMoodFilters, setSelectedMoodFilters] = useState<MoodFilter[]>(
    [],
  )
  const [selectedRuntimeFilter, setSelectedRuntimeFilter] =
    useState<RuntimeFilter | null>(null)
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all')
  const [listSearchQuery, setListSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [aboutMaximized, setAboutMaximized] = useState(false)
  const [initialGalleryReady, setInitialGalleryReady] = useState(
    Boolean(cachedMovieDataset?.length),
  )
  const [loadState, setLoadState] = useState<LoadState>(
    cachedMovieDataset ? 'ready' : 'loading',
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [timeLabel, setTimeLabel] = useState('')

  useEffect(() => {
    let cancelled = false

    loadMovieDataset()
      .then((nextMovies) => {
        if (cancelled) return
        setMovies(nextMovies)
        setActiveMovieId(
          (currentMovieId) => currentMovieId ?? nextMovies[0]?.id ?? null,
        )
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
    (selectedRuntimeFilter ? 1 : 0) +
    (contentFilter !== 'all' ? 1 : 0)

  const visibleMovies = useMemo(
    () => getGalleryWindow(filteredMovies, selectedGenres),
    [filteredMovies, selectedGenres],
  )

  const handleGalleryReady = useCallback(() => {
    if (loadState === 'ready' && visibleMovies.length) {
      setInitialGalleryReady(true)
    }
  }, [loadState, visibleMovies.length])

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
  const filterPresence = useExitPresence(filterOpen)
  const aboutPresence = useExitPresence(aboutOpen)
  const watchPresence = useExitPresence(Boolean(watchMovie), watchMovie)
  const detailsPresence = useExitPresence(Boolean(detailsMovie), detailsMovie)

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((currentGenres) =>
      currentGenres.includes(genre)
        ? currentGenres.filter((currentGenre) => currentGenre !== genre)
        : [...currentGenres, genre],
    )
  }, [])

  const clearGenres = useCallback(() => setSelectedGenres([]), [])
  const clearAllFilters = useCallback(() => {
    setContentFilter('all')
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

  const selectContentFilter = useCallback(
    (nextContentFilter: ContentFilter) => {
      if (nextContentFilter === 'series') return
      setContentFilter(nextContentFilter)
      setSelectedRuntimeFilter(null)
    },
    [],
  )

  const handleOpenMovie = useCallback((movie: TestMovie) => {
    setActiveMovieId(movie.id)
    setDetailsMovieId(movie.id)
    setWatchMovieId(null)
    setFilterOpen(false)
    setAboutOpen(false)
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
      data-details-open={detailsPresence.isPresent ? 'true' : 'false'}
      data-filter-open={filterPresence.isPresent ? 'true' : 'false'}
      data-gallery-ready={initialGalleryReady ? 'true' : 'false'}
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
          onReady={handleGalleryReady}
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

      {mode === 'wall' && !initialGalleryReady ? (
        <output className='warp-gallery-preloader' aria-live='polite'>
          <span>Building gallery</span>
        </output>
      ) : null}

      <div className='warp-filter-actions'>
        {filterPresence.isPresent && selectedFilterCount ? (
          <button
            type='button'
            className={cn(
              'warp-filter-reset',
              filterPresence.motionPhase === 'exit' && 'is-exiting',
            )}
            aria-label='Reset filters'
            onClick={clearAllFilters}
          >
            Reset
          </button>
        ) : null}
        <button
          type='button'
          className={cn('warp-filter-button', filterOpen && 'is-open')}
          aria-expanded={filterOpen}
          aria-label={filterOpen ? 'Close filters' : 'Open filters'}
          onClick={() => setFilterOpen((isOpen) => !isOpen)}
        >
          {filterOpen ? (
            <X className='warp-filter-icon' aria-hidden='true' />
          ) : (
            <SlidersHorizontal
              className='warp-filter-icon'
              aria-hidden='true'
            />
          )}
          <span className='warp-filter-label'>
            {filterOpen ? 'Close' : 'Filter'}
          </span>
          {selectedFilterCount ? (
            <span className='warp-filter-count'>{selectedFilterCount}</span>
          ) : null}
        </button>
      </div>

      {filterPresence.isPresent ? (
        <FilterPanel
          broadened={decisionFilterResult.broadened}
          genres={genreSummaries}
          motionPhase={filterPresence.motionPhase}
          resultCount={filteredMovies.length}
          contentFilter={contentFilter}
          runtimeFilter={selectedRuntimeFilter}
          selectedGenres={selectedGenres}
          selectedMoodFilters={selectedMoodFilters}
          strictResultCount={decisionFilterResult.strictCount}
          onClear={clearAllFilters}
          onSelectContentFilter={selectContentFilter}
          onToggleRuntimeFilter={toggleRuntimeFilter}
          onToggleGenre={toggleGenre}
          onToggleMoodFilter={toggleMoodFilter}
        />
      ) : null}

      {aboutPresence.isPresent ? (
        <AboutDrawer
          maximized={aboutMaximized}
          motionPhase={aboutPresence.motionPhase}
          onClose={() => setAboutOpen(false)}
          onToggleMaximized={() =>
            setAboutMaximized((isMaximized) => !isMaximized)
          }
        />
      ) : null}

      {watchPresence.isPresent && watchPresence.value ? (
        <WatchLinksDialog
          motionPhase={watchPresence.motionPhase}
          movie={watchPresence.value}
          onClose={() => setWatchMovieId(null)}
        />
      ) : null}

      {detailsPresence.isPresent && detailsPresence.value ? (
        <MovieDetailsCard
          movies={movies}
          motionPhase={detailsPresence.motionPhase}
          movie={detailsPresence.value}
          onClose={() => setDetailsMovieId(null)}
          onOpenMovie={handleOpenMovie}
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
  onReady: () => void
  onOpenMovie: (movie: TestMovie) => void
  onSelectMovie: (movie: TestMovie) => void
}

const WarpWall = ({
  activeMovieId,
  isDetailsOpen,
  loadState,
  movies,
  onReady,
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
          movie.genres.slice(0, 2).join(' | ') || movie.overview || 'Movie',
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
        onReady={onReady}
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  )
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
    setCollapsedGroups(new Set())
    onSearchQueryChange('')
    searchInputRef.current?.focus()
  }

  const handleGroupingChange = (nextGrouping: ListGrouping) => {
    setCollapsedGroups(new Set())
    onGroupingChange(nextGrouping)
  }

  const handleSearchQueryChange = (nextSearchQuery: string) => {
    setCollapsedGroups(new Set())
    onSearchQueryChange(nextSearchQuery)
  }

  const toggleCollapsedGroup = (group: string) => {
    setCollapsedGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups)
      if (nextGroups.has(group)) {
        nextGroups.delete(group)
      } else {
        nextGroups.add(group)
      }
      return nextGroups
    })
  }

  const handlePickRandomMovie = () => {
    const movie = movies[Math.floor(Math.random() * Math.max(movies.length, 1))]
    if (!movie) return

    const movieGroup = getMovieListGroupKey(movie, grouping)
    setCollapsedGroups((currentGroups) => {
      if (!currentGroups.has(movieGroup)) return currentGroups
      const nextGroups = new Set(currentGroups)
      nextGroups.delete(movieGroup)
      return nextGroups
    })
    onPickRandomMovie(movie)
    setRandomPulseId(movie.id)
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    pulseTimerRef.current = window.setTimeout(() => {
      setRandomPulseId(null)
      pulseTimerRef.current = null
    }, 1100)

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scroller = document.querySelector<HTMLElement>('.warp-list')
        const row = document.querySelector<HTMLElement>(
          `[data-movie-id="${movie.id}"]`,
        )
        if (!scroller || !row) return

        const startTop = scroller.scrollTop
        const maxTop = Math.max(
          0,
          scroller.scrollHeight - scroller.clientHeight,
        )
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
            onClick={() => handleGroupingChange('year')}
          >
            By year
          </button>
          <button
            type='button'
            className={cn(grouping === 'alpha' && 'is-active')}
            aria-pressed={grouping === 'alpha'}
            onClick={() => handleGroupingChange('alpha')}
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
            onChange={(event) => handleSearchQueryChange(event.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              if (searchQuery) {
                handleSearchQueryChange('')
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
              <Dices className='warp-dice-icon' strokeWidth={2.45} />
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
          {groupedMovies.map(([group, groupMovies]) => {
            const isCollapsed = collapsedGroups.has(group)
            return (
              <section
                className={cn('warp-list-group', isCollapsed && 'is-collapsed')}
                key={group}
              >
                <button
                  type='button'
                  className='warp-list-group-heading'
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleCollapsedGroup(group)}
                >
                  <span>
                    <h2>{group}</h2>
                    <small>
                      {groupMovies.length}{' '}
                      {groupMovies.length === 1 ? 'title' : 'titles'}
                    </small>
                  </span>
                  {isCollapsed ? (
                    <ChevronRight
                      aria-hidden='true'
                      size={18}
                      strokeWidth={2.8}
                    />
                  ) : (
                    <ChevronDown
                      aria-hidden='true'
                      size={18}
                      strokeWidth={2.8}
                    />
                  )}
                </button>
                <div
                  className='warp-list-rows'
                  aria-hidden={isCollapsed || undefined}
                  style={
                    { '--group-row-count': groupMovies.length } as CSSProperties
                  }
                >
                  {groupMovies.map((movie) => (
                    <button
                      type='button'
                      key={movie.id}
                      data-movie-id={movie.id}
                      className={cn(
                        'warp-list-row',
                        activeMovieId === movie.id && 'is-active',
                        randomPulseId === movie.id && 'is-random-pulse',
                      )}
                      tabIndex={isCollapsed ? -1 : undefined}
                      onClick={() => onOpenMovie(movie)}
                      onFocus={() => onSelectMovie(movie)}
                      onMouseEnter={() => onSelectMovie(movie)}
                    >
                      <span className='warp-list-row-poster' aria-hidden='true'>
                        <MoviePoster movie={movie} />
                      </span>
                      <span className='warp-list-row-main'>
                        <span className='warp-list-row-title'>
                          {movie.title}
                        </span>
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
            )
          })}
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
          ? `${formatMovieMeta(activeMovie)} | ${movieCount} indexed`
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
  contentFilter: ContentFilter
  genres: GenreSummary[]
  motionPhase: MotionPhase
  resultCount: number
  runtimeFilter: RuntimeFilter | null
  selectedGenres: string[]
  selectedMoodFilters: MoodFilter[]
  strictResultCount: number
  onClear: () => void
  onSelectContentFilter: (contentFilter: ContentFilter) => void
  onToggleRuntimeFilter: (runtimeFilter: RuntimeFilter) => void
  onToggleGenre: (genre: string) => void
  onToggleMoodFilter: (moodFilter: MoodFilter) => void
}

const FilterPanel = ({
  broadened,
  contentFilter,
  genres,
  motionPhase,
  resultCount,
  runtimeFilter,
  selectedGenres,
  selectedMoodFilters,
  strictResultCount,
  onClear,
  onSelectContentFilter,
  onToggleRuntimeFilter,
  onToggleGenre,
  onToggleMoodFilter,
}: FilterPanelProps) => (
  <aside className='warp-filter-panel' data-motion={motionPhase}>
    <div className='warp-filter-panel-heading'>
      <p>Add filters</p>
      <span>
        {resultCount} {broadened ? 'broadened' : 'matches'}
      </span>
    </div>
    <div className='warp-content-filter' aria-label='Content type'>
      {CONTENT_FILTERS.map((filter) => (
        <button
          type='button'
          className={cn(
            contentFilter === filter.id &&
              (filter.id !== 'all' ||
                (!selectedGenres.length &&
                  !selectedMoodFilters.length &&
                  !runtimeFilter)) &&
              'is-active',
            filter.disabled && 'is-disabled',
          )}
          key={filter.id}
          aria-disabled={filter.disabled || undefined}
          aria-pressed={contentFilter === filter.id}
          disabled={filter.disabled}
          title={filter.disabled ? filter.meta : undefined}
          onClick={() =>
            filter.id === 'all' ? onClear() : onSelectContentFilter(filter.id)
          }
        >
          <span>{filter.label}</span>
          {filter.meta ? <span>{filter.meta}</span> : null}
        </button>
      ))}
    </div>
    {broadened ? (
      <p className='warp-filter-note'>
        Broadened from {strictResultCount} exact matches to keep the wall full.
      </p>
    ) : null}
    <div className='warp-filter-panel-section'>
      <p>{contentFilter === 'series' ? 'Episode runtime' : 'Movie runtime'}</p>
      {(contentFilter === 'series'
        ? SERIES_RUNTIME_FILTERS
        : MOVIE_RUNTIME_FILTERS
      ).map((filter) => (
        <button
          type='button'
          className={cn(
            runtimeFilter === filter.id && 'is-active',
            filter.disabled && 'is-disabled',
          )}
          disabled={filter.disabled}
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
  motionPhase: MotionPhase
  onClose: () => void
  onToggleMaximized: () => void
}

const AboutDrawer = ({
  maximized,
  motionPhase,
  onClose,
  onToggleMaximized,
}: AboutDrawerProps) => (
  <aside
    className={cn('warp-about-drawer', maximized && 'is-maximized')}
    data-motion={motionPhase}
  >
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
  motionPhase: MotionPhase
  movie: TestMovie
  onClose: () => void
}

const WatchLinksDialog = ({
  motionPhase,
  movie,
  onClose,
}: WatchLinksDialogProps) => (
  <section
    className='warp-watch-layer'
    data-motion={motionPhase}
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
  movies: TestMovie[]
  motionPhase: MotionPhase
  movie: TestMovie
  onClose: () => void
  onOpenMovie: (movie: TestMovie) => void
  onSelectGenre: (genre: string) => void
}

const MovieDetailsCard = ({
  movies,
  motionPhase,
  movie,
  onClose,
  onOpenMovie,
  onSelectGenre,
}: MovieDetailsCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartYRef = useRef<number | null>(null)
  const dragPointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (movie.id) {
      setIsExpanded(false)
      setDragOffset(0)
    }
  }, [movie.id])

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    const isDesktopWheel =
      window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
    if (isDesktopWheel && event.deltaY > 10) onClose()
  }

  const handleDragStart = (event: ReactPointerEvent<HTMLElement>) => {
    dragStartYRef.current = event.clientY
    dragPointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleDragMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return
    const startY = dragStartYRef.current
    if (startY === null) return

    const nextOffset = Math.max(-96, Math.min(118, event.clientY - startY))
    setDragOffset(nextOffset)
  }

  const finishDrag = (clientY: number) => {
    const startY = dragStartYRef.current
    if (startY === null) return

    const deltaY = clientY - startY
    dragStartYRef.current = null
    dragPointerIdRef.current = null
    setDragOffset(0)

    if (deltaY < -DETAILS_EXPAND_DRAG_PX) {
      setIsExpanded(true)
      return
    }

    if (isExpanded && deltaY > DETAILS_EXPAND_DRAG_PX) {
      setIsExpanded(false)
      return
    }

    if (deltaY > DETAILS_CLOSE_DRAG_PX) {
      onClose()
    }
  }

  const handleDragEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return
    finishDrag(event.clientY)
  }

  const detailsStyle = {
    '--details-drag-y': `${dragOffset}px`,
  } as CSSProperties
  const similarMovies = useMemo(() => {
    const currentGenres = new Set(movie.genres)
    return movies
      .filter(
        (candidateMovie) =>
          candidateMovie.id !== movie.id &&
          candidateMovie.genres.some((genre) => currentGenres.has(genre)),
      )
      .map((candidateMovie) => ({
        movie: candidateMovie,
        overlap: candidateMovie.genres.filter((genre) =>
          currentGenres.has(genre),
        ).length,
      }))
      .sort(
        (candidateA, candidateB) =>
          candidateB.overlap - candidateA.overlap ||
          (candidateB.movie.ratingValue ?? 0) -
            (candidateA.movie.ratingValue ?? 0) ||
          candidateA.movie.rank - candidateB.movie.rank,
      )
      .slice(0, 6)
      .map(({ movie: similarMovie }) => similarMovie)
  }, [movie.genres, movie.id, movies])

  return (
    <section
      className='warp-details-layer'
      data-motion={motionPhase}
      aria-label={`${movie.title} details`}
      onWheel={handleWheel}
    >
      <button
        type='button'
        className='warp-details-backdrop'
        aria-label='Close details'
        onClick={onClose}
      />
      <button
        type='button'
        className='warp-details-close'
        aria-label='Close details'
        onClick={onClose}
      >
        <X aria-hidden='true' size={18} strokeWidth={3} />
      </button>
      <dialog
        open
        className={cn(
          'warp-details-card',
          isExpanded && 'is-expanded',
          dragOffset !== 0 && 'is-dragging',
        )}
        style={detailsStyle}
        aria-modal='true'
      >
        <div
          className='warp-details-grip-zone'
          onPointerCancel={handleDragEnd}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
          <span className='warp-details-handle' />
        </div>
        <div className='warp-details-poster'>
          <MoviePoster loading='eager' movie={movie} />
        </div>
        <div className='warp-details-copy'>
          <div className='warp-details-copy-scroll'>
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
            {isExpanded ? (
              <div className='warp-details-expanded-content'>
                <section
                  className='warp-details-facts'
                  aria-label='Movie details'
                >
                  <header>
                    <h3>Details</h3>
                    <span>Catalog rank #{movie.rank}</span>
                  </header>
                  <dl>
                    <div>
                      <dt>Year</dt>
                      <dd>
                        {movie.year && movie.year !== '----' ? movie.year : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt>Rating</dt>
                      <dd>{movie.ratingValue ? movie.rating : '-'}</dd>
                    </div>
                    <div>
                      <dt>Hour</dt>
                      <dd>
                        {formatRuntime(movie.runtime, movie.runtimeMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt>Origin</dt>
                      <dd>{movie.countries || '-'}</dd>
                    </div>
                  </dl>
                  <p>
                    {movie.overview ||
                      'No additional description is available for this title yet.'}
                  </p>
                </section>

                {similarMovies.length ? (
                  <section
                    className='warp-details-similar'
                    aria-label='Similar movies'
                  >
                    <header>
                      <h3>Similar movies</h3>
                      <span>{movie.genres.slice(0, 2).join(' | ')}</span>
                    </header>
                    <div className='warp-details-similar-list'>
                      {similarMovies.map((similarMovie) => (
                        <button
                          type='button'
                          key={similarMovie.id}
                          onClick={() => onOpenMovie(similarMovie)}
                        >
                          <span className='warp-details-similar-poster'>
                            <MoviePoster movie={similarMovie} />
                          </span>
                          <span className='warp-details-similar-copy'>
                            <strong>{similarMovie.title}</strong>
                            <span>{formatMovieMeta(similarMovie)}</span>
                            <em>
                              {similarMovie.overview ||
                                'No overview available yet.'}
                            </em>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <button
          type='button'
          className='warp-details-more'
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          <span>{isExpanded ? 'Show less' : 'Similar movies'}</span>
          {isExpanded ? (
            <ChevronsUp aria-hidden='true' size={17} strokeWidth={2.8} />
          ) : (
            <ChevronsDown aria-hidden='true' size={17} strokeWidth={2.8} />
          )}
        </button>
      </dialog>
    </section>
  )
}
