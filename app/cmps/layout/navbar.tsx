import { Eye, EyeOff, GithubIcon, Heart, Settings } from 'lucide-react'

import { useShallowState } from '@/store'
import config from '../../config'
import { cn } from '../../utils/tw'
import { VOROFORCE_PRESET } from '../../vf'
import { Button } from '../ui/button'
import { ThemeToggle } from './theme'

export const Navbar = () => {
  const {
    settingsOpen,
    toggleSettingsOpen,
    favoritesOpen,
    toggleFavoritesOpen,
    uiVisible,
    toggleUiVisible,
    hasFavorites,
    canChangeTheme,
  } = useShallowState((state) => ({
    settingsOpen: state.settingsOpen,
    toggleSettingsOpen: state.toggleSettingsOpen,
    favoritesOpen: state.favoritesOpen,
    toggleFavoritesOpen: state.toggleFavoritesOpen,
    uiVisible: state.uiVisible,
    toggleUiVisible: state.toggleUiVisible,
    hasFavorites:
      state.userConfig.favorites &&
      Object.keys(state.userConfig.favorites).length > 0,
    canChangeTheme:
      state.preset === VOROFORCE_PRESET.minimal ||
      state.preset === VOROFORCE_PRESET.mobile,
  }))

  const buttonClassnames =
    'pointer-events-auto !size-9 cursor-pointer rounded-md text-white/72 hover:bg-white/10 hover:text-white [&_svg]:!size-4'

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-0 z-20 flex w-full items-center justify-center p-3 md:top-0 md:bottom-auto md:z-60 md:justify-end md:px-9 md:py-8'>
      <div className='cinematic-surface pointer-events-auto flex flex-row items-center gap-0.5 rounded-lg p-1 text-white'>
        {uiVisible && (
          <Button
            variant='ghost'
            size='icon'
            aria-label='Open filters and settings'
            title='Filters and settings'
            onClick={toggleSettingsOpen}
            onPointerDown={(event) => {
              if (settingsOpen) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
            className={cn(buttonClassnames, {
              'bg-white/14 text-white': settingsOpen,
            })}
          >
            <Settings />
          </Button>
        )}
        {uiVisible && hasFavorites && (
          <Button
            variant='ghost'
            size='icon'
            aria-label='Open favorites'
            title='Favorites'
            onClick={toggleFavoritesOpen}
            onPointerDown={(event) => {
              if (favoritesOpen) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
            className={cn(buttonClassnames, {
              'bg-white/14 text-white': favoritesOpen,
            })}
          >
            <Heart />
          </Button>
        )}
        <Button
          variant='ghost'
          size='icon'
          aria-label={uiVisible ? 'Hide interface' : 'Show interface'}
          title={uiVisible ? 'Hide interface' : 'Show interface'}
          onClick={toggleUiVisible}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          className={cn(buttonClassnames, {
            'bg-white/14 text-white': !uiVisible,
          })}
        >
          {uiVisible ? <EyeOff /> : <Eye />}
        </Button>
        {uiVisible && (
          <>
            <div className='mx-1 h-5 w-px bg-white/12' />
            <ThemeToggle
              className={cn(buttonClassnames, 'hidden md:inline-flex', {
                'md:hidden': !canChangeTheme,
              })}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            />
            <Button
              variant='ghost'
              size='icon'
              aria-label='Open source code'
              title='Source code'
              className={cn(buttonClassnames, 'hidden md:inline-flex')}
              asChild
            >
              <a
                href={config.sourceCodeUrl}
                target='_blank'
                rel='noreferrer noopener noreferer'
              >
                <GithubIcon />
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
