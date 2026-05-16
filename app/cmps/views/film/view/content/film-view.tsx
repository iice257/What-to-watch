import { useEffect, useMemo, useRef, useState } from 'react'
import config from '../../../../../config'
import { useMediaQuery } from '../../../../../hooks/use-media-query'
import { store } from '../../../../../store'
import { down, orientation } from '../../../../../utils/mq'
import { cn } from '../../../../../utils/tw'
import type { Film } from '../../../../../vf'
import { AnimateDimensionsChange } from '../../../../common/animate-dimensions-change'
import { Badge } from '../../../../ui/badge'
import { FilmRatingGauge } from '../../shared/film-rating-gauge'

export const FilmView = ({
  film,
  className = '',
}: { film?: Film; className?: string }) => {
  const isSmallScreen = useMediaQuery(down('md'))
  const isLandscape = useMediaQuery(orientation('landscape'))
  const [viewHovered, setViewHovered] = useState(false)

  const filmRef = useRef<Film>(undefined)
  const ua = store((state) => state.ua)

  const [backdropHidden, setBackdropHidden] = useState(true)
  const [backdropErrored, setBackdropErrored] = useState(true)

  useEffect(() => {
    if (filmRef.current?.tmdbId !== film?.tmdbId) {
      setBackdropHidden(true)
    }
    filmRef.current = film
  }, [film])

  const isIOS = useMemo(() => ua.getOS()?.name === 'iOS', [ua])

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
      <div className={cn('landscape:h-full', className)}>
        <div
          className={cn(
            'absolute inset-0 h-full w-full transition-colors duration-700',
            {
              '!bg-background': viewHovered,
              'bg-background/70':
                isSmallScreen || isIOS || backdropErrored || backdropHidden,
            },
          )}
        >
          {!isIOS && (
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
              {},
            )}
          >
            <div className='flex h-full w-full flex-row gap-6 p-4 md:p-6 lg:p-6 xl:p-9'>
              <div className='flex w-full flex-col justify-between gap-9'>
                <div className='flex w-full flex-col gap-3'>
                  <div className='relative flex w-full flex-row items-start justify-between gap-3 pr-16 md:pr-28'>
                    <h3 className='font-black text-2xl leading-none md:text-3xl lg:text-4xl xl:text-5xl'>
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
                    <p className='line-clamp-2 text-base text-foreground/80 italic leading-none md:line-clamp-1 lg:text-xl'>
                      {film.tagline}
                    </p>
                    <div className='flex flex-row gap-3 pt-2'>
                      {film.genres?.map((genre) => (
                        <Badge
                          className='whitespace-nowrap text-[0.6rem] leading-none md:text-xs'
                          key={genre}
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className='full mb-15 px-4 pb-6 md:px-6 lg:px-6 lg:pb-6 xl:px-9 xl:pb-9'>
            <div className='flex flex-col justify-end text-base leading-tight max-md:text-sm max-lg:h-[calc(4em*1.25)] group-hover:md:h-auto group-hover:md:min-h-[calc(4em*1.25)] lg:h-[calc(4em*1.25)] lg:text-xl group-hover:lg:h-auto'>
              <p className='max-lg:line-clamp-4 group-hover:max-lg:line-clamp-none group-hover:md:max-lg:line-clamp-4 lg:line-clamp-4 group-hover:lg:line-clamp-none'>
                {film.overview}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnimateDimensionsChange>
  )
}
