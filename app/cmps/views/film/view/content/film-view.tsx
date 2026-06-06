import { useEffect, useMemo, useRef, useState } from 'react'
import config from '../../../../../config'
import { useMediaQuery } from '../../../../../hooks/use-media-query'
import { store } from '../../../../../store'
import { useShallowState } from '../../../../../store'
import { down, orientation } from '../../../../../utils/mq'
import { cn } from '../../../../../utils/tw'
import {
  type DiscoveryTag,
  type Film,
  assignFilmToCell,
  findFilmLocation,
  getDiscoveryTags,
  getSimilarFilms,
} from '../../../../../vf'
import { AnimateDimensionsChange } from '../../../../common/animate-dimensions-change'
import { Badge } from '../../../../ui/badge'
import { FilmPoster } from '../../shared/film-poster'
import { FilmRatingGauge } from '../../shared/film-rating-gauge'

const discoveryTagLabels: Record<DiscoveryTag, string> = {
  'crowd-pleaser': 'Crowd pleaser',
  'hidden-gem': 'Hidden gem',
  'recent-pick': 'Recent pick',
  throwback: 'Throwback',
  'comfort-watch': 'Comfort watch',
  'high-energy': 'High energy',
  'slow-burn': 'Slow burn',
  'visually-striking': 'Visually striking',
}

export const FilmView = ({
  film,
  className = '',
}: { film?: Film; className?: string }) => {
  const isSmallScreen = useMediaQuery(down('md'))
  const isLandscape = useMediaQuery(orientation('landscape'))
  const [viewHovered, setViewHovered] = useState(false)

  const filmRef = useRef<Film>(undefined)
  const previousFilmRef = useRef<Film>(undefined)
  const ua = store((state) => state.ua)
  const { filmBatches, setFilm, voroforce } = useShallowState((state) => ({
    filmBatches: state.filmBatches,
    setFilm: state.setFilm,
    voroforce: state.voroforce,
  }))

  const [backdropHidden, setBackdropHidden] = useState(true)
  const [backdropErrored, setBackdropErrored] = useState(true)

  useEffect(() => {
    if (filmRef.current?.tmdbId !== film?.tmdbId) {
      setBackdropHidden(true)
    }
    filmRef.current = film
  }, [film])

  const isIOS = useMemo(() => ua.getOS()?.name === 'iOS', [ua])
  const similarFilms = useMemo(() => {
    if (!film) return []
    const matches = getSimilarFilms(film, filmBatches, 4)
    const previousFilm = previousFilmRef.current
    if (
      previousFilm &&
      previousFilm.tmdbId !== film.tmdbId &&
      !matches.some(({ film }) => film.tmdbId === previousFilm.tmdbId)
    ) {
      return [
        {
          film: previousFilm,
          score: 1,
          reasons: ['Previous pick'],
        },
        ...matches.slice(0, 3),
      ]
    }
    return matches
  }, [film, filmBatches])
  const discoveryTags = useMemo(
    () => (film ? getDiscoveryTags(film).slice(0, 3) : []),
    [film],
  )
  const visibleSimilarFilms = isSmallScreen
    ? similarFilms.slice(0, 3)
    : similarFilms

  const navigateToSimilarFilm = (similarFilm: Film) => {
    const location = findFilmLocation(similarFilm, filmBatches)
    const cells = voroforce?.cells
    const controls = voroforce?.controls
    if (!location || !cells?.length || !controls) return

    const targetCell = controls.cells?.selected ?? controls.cells?.focused
    if (!targetCell) return

    previousFilmRef.current = film
    assignFilmToCell(targetCell, location)
    const scene = voroforce.display?.scene
    if (scene?.cellIdsTexture) scene.cellIdsTexture.needsUpdate = true
    if (scene?.cellMediaVersionsTexture) {
      scene.cellMediaVersionsTexture.needsUpdate = true
    }

    setFilm(similarFilm)
    controls.navigateToCell(targetCell)
  }

  if (!film) return

  return (
    <AnimateDimensionsChange
      enabled={!(isSmallScreen && isLandscape)}
      axis='height'
      className='relative ease-linear max-lg:landscape:static'
      duration={300}
      delay={0}
      {...(!isSmallScreen && {
        onMouseEnter: () => setViewHovered(true),
        onMouseLeave: () => setViewHovered(false),
      })}
    >
      <div
        className={cn('max-md:not-landscape:h-dvh landscape:h-full', className)}
      >
        <div
          className={cn(
            'absolute inset-0 h-full min-h-dvh w-full overflow-hidden bg-background transition-colors duration-700',
            {
              '!bg-background': viewHovered && !isSmallScreen,
              'bg-background/78':
                !isSmallScreen && (isIOS || backdropErrored || backdropHidden),
            },
          )}
        >
          {isSmallScreen && film.poster && (
            <img
              className='absolute inset-0 h-full min-h-dvh w-full scale-110 object-cover object-center opacity-42 blur-2xl saturate-110 transition-opacity duration-700'
              alt=''
              src={`${config.posterBaseUrl}${film.poster}`}
            />
          )}
          {isSmallScreen && film.poster && (
            <div className='absolute inset-0 bg-gradient-to-b from-black/15 via-black/58 to-black/92' />
          )}
          {!isIOS && !isSmallScreen && (
            <img
              className={cn(
                'h-full w-full object-cover object-center opacity-0 transition-opacity duration-500 will-change-[opacity]',
                {
                  '!w-0 !h-0': backdropErrored,
                  '!opacity-32 dark:!opacity-32': !backdropHidden,
                },
              )}
              alt=''
              src={`${config.backdropBaseUrl}${film.backdrop}`}
              onLoad={() => {
                setBackdropHidden(false)
                setBackdropErrored(false)
              }}
              onError={() => {
                setBackdropErrored(true)
              }}
            />
          )}
        </div>

        <div className='relative z-1 flex h-full w-full flex-col'>
          <div
            className={cn(
              'w-full group-hover:h-auto group-hover:min-h-64 md:h-56 md:not-landscape:h-56 group-hover:md:not-landscape:min-h-56 lg:h-64 max-md:landscape:h-full group-hover:lg:landscape:min-h-64 group-hover:md:landscape:min-h-56',
              'max-md:not-landscape:min-h-[38dvh] max-md:not-landscape:pt-[5dvh]',
            )}
          >
            <div className='flex h-full w-full flex-row items-end gap-4 p-4 md:items-start md:gap-5 md:p-6'>
              <FilmPoster
                film={film}
                className='h-36 w-24 shrink-0 rounded-lg border border-white/14 object-cover shadow-2xl shadow-black/60 md:h-44 md:w-[7.4rem]'
              />
              <div className='flex w-full flex-col justify-between gap-9'>
                <div className='flex w-full flex-col gap-3'>
                  <div className='relative flex w-full flex-row items-start justify-between gap-3 pr-16 md:pr-28'>
                    <div>
                      <div className='panel-kicker mb-2'>Now focused</div>
                      <h3 className='break-words font-semibold text-3xl leading-[0.96] md:text-4xl'>
                        {film.title}
                      </h3>
                      <div className='mt-2 flex items-center gap-2 text-foreground/55 text-sm'>
                        {film.year ? <span>{film.year}</span> : null}
                        {film.runtime ? (
                          <>
                            <span>•</span>
                            <span>
                              {Math.floor(film.runtime / 60)}h{' '}
                              {film.runtime % 60}m
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className='absolute top-0 right-0 flex flex-row-reverse items-center gap-3'>
                      <FilmRatingGauge value={film.rating} />
                      <div className='hidden text-xxs leading-none md:not-landscape:block lg:hidden xl:block'>
                        TMDB <br />
                        Score
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-col gap-3'>
                    <p className='line-clamp-2 text-foreground/70 text-sm italic leading-snug md:line-clamp-1 md:text-base'>
                      {film.tagline}
                    </p>
                    <div className='flex flex-row flex-wrap gap-2 pt-1'>
                      {film.genres?.map((genre) => (
                        <Badge className='whitespace-nowrap' key={genre}>
                          {genre}
                        </Badge>
                      ))}
                    </div>
                    {discoveryTags.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {discoveryTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant='outline'
                            className='text-foreground/70'
                          >
                            {discoveryTagLabels[tag]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='full mb-15 px-4 pb-36 md:px-6 md:pb-24'>
            <div className='border-white/10 border-t pt-5'>
              <h4 className='panel-kicker mb-2'>Overview</h4>
              <p className='max-lg:line-clamp-4 group-hover:max-lg:line-clamp-none group-hover:md:max-lg:line-clamp-4 lg:line-clamp-4 group-hover:lg:line-clamp-none'>
                {film.overview}
              </p>
            </div>
            {similarFilms.length > 0 && (
              <div className='mt-6 border-white/10 border-t pt-5 text-xs md:text-sm'>
                <h4 className='panel-kicker mb-3'>Similar films</h4>
                <div className='grid grid-cols-1 gap-2'>
                  {visibleSimilarFilms.map(({ film: similarFilm, reasons }) => (
                    <button
                      type='button'
                      key={similarFilm.tmdbId}
                      className='flex max-w-full cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-2 text-left text-foreground/80 transition-colors hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
                      onClick={() => navigateToSimilarFilm(similarFilm)}
                    >
                      <FilmPoster
                        film={similarFilm}
                        className='h-14 w-10 shrink-0 rounded object-cover'
                      />
                      <div className='min-w-0'>
                        <div className='truncate font-medium'>
                          {similarFilm.title}
                        </div>
                        <div className='mt-0.5 truncate text-foreground/50 text-xs'>
                          {[similarFilm.year, ...reasons]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimateDimensionsChange>
  )
}
