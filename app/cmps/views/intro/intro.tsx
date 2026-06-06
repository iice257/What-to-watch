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
        'fixed inset-x-0 top-0 z-60 flex h-dvh w-full justify-center overflow-hidden bg-background px-5 duration-700 md:px-12',
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
      <div className='relative flex h-full w-full max-w-xl flex-col items-stretch'>
        <div className='pointer-events-none absolute inset-x-0 top-0 mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-primary/60 to-transparent' />
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
          <div className='text-center'>
            <div className='panel-kicker mb-4'>Interactive film discovery</div>
            <h1 className='font-semibold text-4xl leading-none tracking-normal md:text-5xl md:leading-none'>
              <span className='inline-flex'>What</span>{' '}
              <span className='relative inline-flex'>
                to Watch
                <span className='absolute bottom-0 left-full after:animate-ellipsis' />
              </span>
            </h1>
            <p className='mx-auto mt-4 max-w-md text-muted-foreground text-sm leading-relaxed'>
              Explore thousands of films through one continuous visual canvas.
            </p>
          </div>
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
            className='cinematic-surface absolute inset-x-0 bottom-8 w-full rounded-lg p-5 duration-300 max-md:hidden max-lg:landscape:bottom-6'
            transitionOptions={{
              timeout: 250,
            }}
          >
            <DeviceClassWidget />
            <MoviesDatasetLicenseInfo />
          </FadeTransition>
          <FadeTransition
            visible={hasDeviceClass && !preset}
            className='cinematic-surface absolute inset-x-0 bottom-8 w-full rounded-lg p-5 duration-300 max-lg:landscape:bottom-6'
            transitionOptions={{
              timeout: 250,
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
  <span className='mt-4 inline-flex text-[0.58rem] text-muted-foreground leading-relaxed'>
    Contains information from Kaggle's "Full TMDB Movies Dataset" which is made
    available under the ODC Attribution License.
  </span>
)

const DEFAULT_REVEAL_SCREEN_DELAY = 700
const DEFAULT_PREVIEW_MODE_REVEAL_SCREEN_DELAY = 900
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
