import { useCallback, useEffect, useRef, useState } from 'react'

import { selectIsPreviewMode, useShallowState } from '@/store'
import {
  MIN_LERP_EASING_TYPES,
  type VoroforceCell,
  type VoroforceCells,
  easedMinLerp,
} from '@/vf'
import useDimensions from '../../../hooks/use-dimensions'
import { useMediaQuery } from '../../../hooks/use-media-query'
import { clamp, lerp } from '../../../utils/math'
import { down, only, orientation } from '../../../utils/mq'
import { cn } from '../../../utils/tw'
import { Badge } from '../../ui/badge'
import { FilmPoster } from './shared/film-poster'
import { FilmRatingGauge } from './shared/film-rating-gauge'

export const FilmPreview = ({ poster = false }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const isSmallScreen = useMediaQuery(down('md'))
  const isLandscape = useMediaQuery(orientation('landscape'))
  const isOnlyMdScreen = useMediaQuery(only('md'))
  const isOnlyMdLandscapeScreen = isLandscape && isOnlyMdScreen
  const isStatic = isSmallScreen || isOnlyMdLandscapeScreen
  const [dimensionsRef, dimensions] = useDimensions()

  const { film, isPreviewMode, config, voroforce } = useShallowState(
    (state) => ({
      film: state.film,
      isPreviewMode: selectIsPreviewMode(state),
      config: state.config?.filmPreview,
      voroforce: state.voroforce,
    }),
  )

  if (config && 'enabled' in config && !config.enabled) return null
  const neighborOriginMod = useRef<number>(
    config && 'neighborOriginMod' in config
      ? (config.neighborOriginMod ?? 1)
      : 1,
  )
  const scaleMod = useRef<number>(
    config && 'scaleMod' in config ? (config.scaleMod ?? 1) : 1,
  )

  const [reversedX, setReversedX] = useState(false)
  const [reversedY, setReversedY] = useState(false)
  const reversedXRef = useRef(reversedX)
  const reversedYRef = useRef(reversedY)
  const reverseX = useCallback((reverse: boolean) => {
    reversedXRef.current = reverse
    setReversedX(reverse)
  }, [])
  const reverseY = useCallback((reverse: boolean) => {
    reversedYRef.current = reverse
    setReversedY(reverse)
  }, [])

  const [hasAppliedStyles, setHasAppliedStyles] = useState(false)

  const cellsRef = useRef<VoroforceCells>(null)
  const primaryCellRef = useRef<VoroforceCell>(null)
  const topNeighborCellRef = useRef<{ x: number; y: number }>(undefined)
  const bottomNeighborCellRef = useRef<{ x: number; y: number }>(undefined)
  const positionRef = useRef<{ x: number; y: number }>(undefined)
  const scaleRef = useRef<number>(0)
  const opacityRef = useRef<number>(0)
  const frameRef = useRef<number>(0)

  const onCellFocused = useCallback(
    ({ cell }: { cell?: VoroforceCell } = {}) => {
      if (!voroforce) return
      if (isStatic) return
      if (cell) primaryCellRef.current = cell
      if (!primaryCellRef.current || !cellsRef.current) return

      const {
        config: {
          lattice: { cols },
        },
      } = voroforce
      topNeighborCellRef.current =
        cellsRef.current[primaryCellRef.current.index - cols] ??
        topNeighborCellRef.current

      bottomNeighborCellRef.current =
        cellsRef.current[primaryCellRef.current.index + cols] ??
        bottomNeighborCellRef.current
    },
    [isStatic, voroforce],
  )

  const resetStyles = useCallback(() => {
    if (!containerRef.current) return
    if (!innerRef.current) return
    containerRef.current.style.translate = ''
    innerRef.current.style.scale = ''
    innerRef.current.style.opacity = ''
  }, [])

  const applyStyles = useCallback(() => {
    if (!containerRef.current) return
    if (!innerRef.current) return
    if (!positionRef.current) return
    setHasAppliedStyles(true)
    containerRef.current.style.translate = `${positionRef.current.x}px ${positionRef.current.y}px`
    innerRef.current.style.scale = `${scaleRef.current}`
    innerRef.current.style.opacity = `${scaleRef.current}`
  }, [])

  useEffect(() => {
    if (!voroforce) return
    if (isStatic) {
      resetStyles()
      return
    }
    const {
      ticker,
      controls: { pointer },
    } = voroforce

    let customSpeedScale = 0

    const onTick = () => {
      if (!primaryCellRef.current) return
      if (!containerRef.current) return
      if (!innerRef.current) return
      if (!topNeighborCellRef.current) return
      if (!bottomNeighborCellRef.current) return

      const neighborCell = reversedYRef.current
        ? bottomNeighborCellRef.current
        : topNeighborCellRef.current

      const origin =
        neighborOriginMod.current === 1
          ? neighborCell
          : {
              x: lerp(
                primaryCellRef.current.x,
                neighborCell.x,
                neighborOriginMod.current,
              ),
              y: lerp(
                primaryCellRef.current.y,
                neighborCell.y,
                neighborOriginMod.current,
              ),
            }

      const targetPosition = {
        x:
          origin.x -
          (reversedXRef.current
            ? dimensions.width * 0.5
            : dimensions.width * 0.25) *
            scaleMod.current,
        y: origin.y - (reversedYRef.current ? 0 : dimensions.height),
      }

      if (!positionRef.current) {
        positionRef.current = {
          x: targetPosition.x,
          y: targetPosition.y,
        }
      } else {
        positionRef.current.x = easedMinLerp(
          positionRef.current.x,
          targetPosition.x,
          0.1,
          MIN_LERP_EASING_TYPES.easeInOutQuad,
        )
        positionRef.current.y = easedMinLerp(
          positionRef.current.y,
          targetPosition.y,
          0.1,
          MIN_LERP_EASING_TYPES.easeInOutQuad,
        )
      }

      customSpeedScale = 1.25 - clamp(0.25, 1.25, pointer.speedScale * 4)
      scaleRef.current = easedMinLerp(
        scaleRef.current,
        customSpeedScale * scaleMod.current,
        0.05,
        MIN_LERP_EASING_TYPES.easeInOutQuad,
      )
      opacityRef.current = easedMinLerp(
        opacityRef.current,
        customSpeedScale,
        0.05,
      )
      applyStyles()

      if (frameRef.current % 60 === 0) {
        const topOrigin =
          neighborOriginMod.current === 1
            ? topNeighborCellRef.current
            : {
                x: lerp(
                  primaryCellRef.current.x,
                  topNeighborCellRef.current.x,
                  neighborOriginMod.current,
                ),
                y: lerp(
                  primaryCellRef.current.y,
                  topNeighborCellRef.current.y,
                  neighborOriginMod.current,
                ),
              }

        if (topOrigin.y - dimensions.height < 0) {
          reverseY(true)
        } else if (
          reversedYRef.current &&
          topOrigin.y - dimensions.height > dimensions.height
        ) {
          reverseY(false)
        }

        const width = dimensions.width * 0.25

        if (origin.x - width < 0) {
          reverseX(true)
        } else if (reversedXRef.current && origin.x - width > width) {
          reverseX(false)
        }
      }

      frameRef.current++
    }
    ticker.addEventListener('tick', onTick)

    return () => {
      ticker.removeEventListener('tick', onTick)
    }
  }, [
    isStatic,
    dimensions,
    reverseY,
    reverseX,
    applyStyles,
    resetStyles,
    voroforce,
  ])

  useEffect(() => {
    if (!voroforce) return
    if (isStatic) return
    const { controls, cells } = voroforce
    if (!cellsRef.current) cellsRef.current = cells as VoroforceCells

    controls.addEventListener('focused', onCellFocused)
    return () => {
      controls.removeEventListener('focused', onCellFocused)
    }
  }, [isStatic, onCellFocused, voroforce])

  const refFn = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element
      dimensionsRef(element)
    },
    [dimensionsRef],
  )

  return (
    <>
      {film && (
        <div
          ref={refFn}
          className={cn(
            'pointer-events-none fixed top-0 left-0 z-10 w-full max-w-full p-4 opacity-0 transition-opacity duration-700 md:p-9 md:max-lg:landscape:w-auto md:max-lg:landscape:max-w-2/3',
            {
              'md:h-52 md:w-300 md:p-0 md:will-change-transform': !isStatic,
              '!opacity-100': isPreviewMode && (hasAppliedStyles || isStatic),
            },
          )}
        >
          <div
            ref={innerRef}
            className={cn('flex origin-top-left flex-row gap-3 lg:gap-9', {
              'md:will-change-[transform,opacity]': !isStatic,
              'flex-row-reverse': reversedX,
            })}
          >
            {poster && (
              <FilmPoster
                film={film}
                className={cn(
                  'w-full max-w-[150px] shrink-0 basis-1/4 rounded-2xl lg:max-w-[300px] lg:basis-1/4',
                  {
                    'pointer-events-auto': isPreviewMode,
                  },
                )}
              />
            )}
            <div
              className={cn(
                'flex basis-full flex-row justify-between gap-3 lg:gap-6 md:max-lg:landscape:flex-row-reverse',
                {
                  'md:basis-3/4 md:flex-col md:justify-start md:gap-4':
                    !isStatic,
                  'items-end text-right': reversedX,
                  'md:flex-col-reverse': reversedY,
                },
              )}
            >
              <div
                className={cn('flex flex-col gap-3 lg:justify-start lg:gap-3', {
                  'flex-col-reverse': reversedY,
                })}
              >
                <p className='line-clamp-2 hidden font-medium text-base text-foreground/90 leading-none md:inline-block lg:line-clamp-1 lg:h-[1.25rem] lg:text-xl lg:leading-none landscape:h-[1rem] lg:landscape:h-[1.25rem]'>
                  {film.tagline}
                </p>
                <h3 className='line-clamp-2.2 font-black text-2xl leading-none lg:line-clamp-1.1 lg:text-5xl landscape:line-clamp-1.1'>
                  {film.title}
                  <span className='font-normal text-foreground/50 text-xl leading-none lg:text-3xl'>
                    &nbsp;({film.year})
                  </span>
                </h3>
                <div
                  className={cn(
                    'flex flex-row flex-wrap gap-3 lg:flex-nowrap lg:pt-2',
                    {
                      'justify-end': reversedX,
                    },
                  )}
                >
                  {film.genres?.map((genre) => (
                    <Badge
                      key={genre}
                      className='whitespace-nowrap text-[0.6rem] leading-none lg:text-xs'
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
              <FilmRatingGauge value={film.rating} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
