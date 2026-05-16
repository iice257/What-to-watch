import { useEffect, useReducer, useState } from 'react'
import { useShallowState } from '../../../store'
import { isDefined } from '../../../utils/misc'
import { cn } from '../../../utils/tw'
import { VOROFORCE_MODE } from '../../../vf'
import { OBSCURE_VISUAL_DEFECTS } from '../../../vf/consts'
import { CoreSettingsWidget } from '../../common/core-settings/core-settings-widget'
import { DeviceClassWidget } from '../../common/device-class/device-class-widget'
import { FadeTransition } from '../../common/fade-transition'
import { SmallScreenWarning } from '../../common/small-screen-warning'

export const Intro = () => {
  const { preset, hasDeviceClass } = useShallowState((state) => ({
    preset: state.preset,
    hasDeviceClass: isDefined(state.deviceClass),
  }))

  const [initialPreset] = useState(preset)

  const visible = useIntroVisible()

  return (
    <FadeTransition
      className={cn(
        'fixed inset-x-0 top-0 z-60 flex h-dvh w-full justify-center bg-background px-12 duration-700',
        {
          '!duration-0': visible,
        },
      )}
      visible={visible}
      transitionOptions={{
        initialEntered: visible,
        timeout: visible ? 0 : 700,
      }}
    >
      <div className='flex h-full flex-col items-stretch'>
        <div
          className={cn('h-1/3', {
            'max-lg:landscape:hidden [@media(min-aspect-ratio:2.5)]:hidden':
              !initialPreset,
          })}
        />
        <div
          className={cn('flex h-1/3 flex-col items-center justify-center', {
            'max-lg:landscape:h-1/2 max-lg:landscape:justify-start max-lg:landscape:pt-12 [@media(min-aspect-ratio:2.5)]:h-1/2 [@media(min-aspect-ratio:2.5)]:justify-start [@media(min-aspect-ratio:2.5)]:pt-12':
              !initialPreset,
          })}
        >
          <h1 className='font-black text-4xl leading-none md:text-5xl md:leading-none'>
            <span className='inline-flex'>
              <span className='max-md:hidden'>"</span>
              <i>There's nothing</i>
            </span>{' '}
            <span className='relative inline-flex'>
              <i>to watch</i>
              <span className='max-md:hidden'>"</span>
              <span className='absolute bottom-0 left-full after:animate-ellipsis' />
            </span>
          </h1>
        </div>
        <div
          className={cn(
            'relative flex h-1/3 flex-col items-stretch justify-end gap-4 pb-12',
            {
              'max-lg:landscape:h-1/2 max-lg:landscape:pb-6 [@media(min-aspect-ratio:2.5)]:h-1/2':
                !initialPreset,
            },
          )}
        >
          <FadeTransition
            visible={!hasDeviceClass}
            className='absolute inset-x-0 bottom-12 w-full duration-1000 max-md:hidden max-lg:landscape:bottom-6'
            transitionOptions={{
              timeout: 500,
            }}
          >
            <DeviceClassWidget />
            <MoviesDatasetLicenseInfo />
          </FadeTransition>
          <FadeTransition
            visible={hasDeviceClass && !preset}
            className='absolute inset-x-0 bottom-12 w-full duration-1000 max-lg:landscape:bottom-6'
            transitionOptions={{
              timeout: 500,
            }}
          >
            <SmallScreenWarning />
            <CoreSettingsWidget
              submitLabel='Continue'
              submitVisibility='always'
            />
            <MoviesDatasetLicenseInfo />
          </FadeTransition>
        </div>
      </div>
    </FadeTransition>
  )
}

const MoviesDatasetLicenseInfo = () => (
  <span className='inline-flex text-xxs text-zinc-600 leading-none dark:text-zinc-300'>
    Contains information from Kaggle's "Full TMDB Movies Dataset" which is made
    available under the ODC Attribution License.
  </span>
)

const DEFAULT_REVEAL_SCREEN_DELAY = 1200
const DEFAULT_PREVIEW_MODE_REVEAL_SCREEN_DELAY = 600
let hideScreen = OBSCURE_VISUAL_DEFECTS
function useIntroVisible() {
  const { introRequired, voroforceMediaPreloaded, revealScreenDelay } =
    useShallowState((state) => ({
      introRequired: !state.playedIntro || !state.preset,
      voroforceMediaPreloaded: state.voroforceMediaPreloaded,
      revealScreenDelay: state.config?.revealScreenDelay
        ? (state.config.revealScreenDelay.modes?.[state.mode] ??
          state.config.revealScreenDelay.default)
        : state.mode === VOROFORCE_MODE.preview
          ? DEFAULT_PREVIEW_MODE_REVEAL_SCREEN_DELAY
          : DEFAULT_REVEAL_SCREEN_DELAY,
    }))

  if (OBSCURE_VISUAL_DEFECTS) {
    const [, forceUpdate] = useReducer((x) => x + 1, 0)
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    useEffect(() => {
      setTimeout(() => {
        hideScreen = false
        forceUpdate()
      }, revealScreenDelay)
    }, [])

    useEffect(() => {
      let timeout: NodeJS.Timeout
      const onResize = () => {
        hideScreen = true
        forceUpdate()
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          hideScreen = false
          forceUpdate()
        }, revealScreenDelay)
      }
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('resize', onResize)
      }
    }, [revealScreenDelay])
  }

  return introRequired || hideScreen || !voroforceMediaPreloaded
}
