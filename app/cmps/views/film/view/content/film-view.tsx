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
            'absolute inset-0 h-full min-h-dvh w-full overflow-hidden transition-colors duration-700',
            {
              '!bg-background': viewHovered && !isSmallScreen,
              'bg-black/20': isSmallScreen,
              'bg-background/70':
                !isSmallScreen && (isIOS || backdropErrored || backdropHidden),
            },
          )}
        >
          {isSmallScreen && film.poster && (
            <img
              className='absolute inset-0 h-full min-h-dvh w-full scale-110 object-cover object-center opacity-60 blur-xl saturate-125 transition-opacity duration-700'
              alt=''
              src={`${config.posterBaseUrl}${film.poster}`}
            />
          )}
          {isSmallScreen && film.poster && (
            <div className='absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black/68' />
          )}
          {!isIOS && !isSmallScreen && (
            <img
              className={cn(
                'h-full w-full object-cover object-center opacity-0 transition-opacity duration-500 will-change-[opacity]',
                {
                  '!w-0 !h-0': backdropErrored,
                  '!opacity-60 dark:!opacity-60': !backdropHidden,
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
              'w-full group-hover:h-auto group-hover:min-h-64 md:h-48 md:not-landscape:h-48 group-hover:md:not-landscape:min-h-48 lg:h-64 max-md:landscape:h-full group-hover:lg:landscape:min-h-64 group-hover:md:landscape:min-h-48',
              'max-md:not-landscape:min-h-[45dvh] max-md:not-landscape:pt-[12dvh]',
            )}
          >
            <div className='flex h-full w-full flex-row gap-6 p-4 md:p-6 lg:p-6 xl:p-9'>
              <div className='flex w-full flex-col justify-between gap-9'>
                <div className='flex w-full flex-col gap-3'>
                  <div className='relative flex w-full flex-row items-start justify-between gap-3 pr-16 md:pr-28'>
                    <h3 className='break-words font-black text-3xl leading-none md:text-3xl lg:text-4xl xl:text-5xl'>
                      {film.title}
                      {film.year && (
                        <span className='font-medium text-foreground/50'>
                          &nbsp;({film.year})
                        </span>
                      )}
                    </h3>
                    <div className='absolute top-0 right-0 flex flex-row-reverse items-center gap-3'>
                      <FilmRatingGauge value={film.rating} />
                      <div className='hidden text-xxs leading-none md:not-landscape:block lg:hidden xl:block'>
                        TMDB <br />
                        Score
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-col gap-3'>
                    <p className='line-clamp-2 text-foreground/80 text-lg italic leading-none md:line-clamp-1 lg:text-xl'>
                      {film.tagline}
                    </p>
                    <div className='flex flex-row flex-wrap gap-3 pt-2'>
                      {film.genres?.map((genre) => (
                        <Badge
                          className='whitespace-nowrap px-4 py-2 text-sm leading-none md:px-2.5 md:py-0.5 md:text-xs'
                          key={genre}
                        >
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
                            className='border-foreground/25 bg-background/30 px-4 py-2 text-foreground/75 text-sm leading-none backdrop-blur-sm md:px-2.5 md:py-0.5 md:text-xs'
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
          <div className='full mb-15 px-4 pb-36 md:px-6 md:pb-6 lg:px-6 lg:pb-6 xl:px-9 xl:pb-9'>
            <div className='flex flex-col justify-end text-base leading-tight max-md:text-base max-lg:h-[calc(4em*1.25)] group-hover:md:h-auto group-hover:md:min-h-[calc(4em*1.25)] lg:h-[calc(4em*1.25)] lg:text-xl group-hover:lg:h-auto'>
              <p className='max-lg:line-clamp-4 group-hover:max-lg:line-clamp-none group-hover:md:max-lg:line-clamp-4 lg:line-clamp-4 group-hover:lg:line-clamp-none'>
                {film.overview}
              </p>
            </div>
            {similarFilms.length > 0 && (
              <div className='mt-4 flex flex-col gap-2 text-xs md:text-sm'>
                <h4 className='font-semibold text-foreground/70 uppercase leading-none tracking-normal'>
                  Movies like this
                </h4>
                <div className='flex flex-wrap gap-2'>
                  {visibleSimilarFilms.map(({ film: similarFilm, reasons }) => (
                    <button
                      type='button'
                      key={similarFilm.tmdbId}
                      className='max-w-full cursor-pointer rounded-md border border-foreground/20 bg-background/20 px-3 py-2.5 text-left text-base text-foreground/80 leading-tight backdrop-blur-sm transition-colors hover:bg-background/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:px-2 md:py-1.5 md:text-sm'
                      onClick={() => navigateToSimilarFilm(similarFilm)}
                    >
                      <div className='truncate font-medium'>
                        {similarFilm.title}
                        {similarFilm.year ? ` (${similarFilm.year})` : ''}
                      </div>
                      {reasons.length > 0 && (
                        <div className='mt-0.5 truncate text-foreground/55 text-xxs'>
                          {reasons.join(' / ')}
                        </div>
                      )}
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
