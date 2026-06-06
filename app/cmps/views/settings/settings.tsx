import { useShallowState } from '@/store'
import { Info, RotateCw, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { THEME } from '../../../consts'
import { reloadWithoutIntro } from '../../../utils/misc'
import { VOROFORCE_PRESET } from '../../../vf'
import { MOVIE_FILTER_GENRES } from '../../../vf/data/movie-filter-index'
import type { MovieLengthFilter } from '../../../vf/utils'
import { CoreSettingsWidget } from '../../common/core-settings/core-settings-widget'
import { Modal } from '../../common/modal'
import { SmallScreenWarning } from '../../common/small-screen-warning'
import { useTheme } from '../../layout'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { ScrollArea } from '../../ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { Switch } from '../../ui/switch'

const ALL_FILTER_VALUE = 'all'

export const Settings = () => {
  const {
    open,
    setOpen,
    voroforce,
    userConfig,
    setUserConfig,
    setPlayedIntro,
    canChangeTheme,
    setAboutOpen,
  } = useShallowState((state) => ({
    open: state.settingsOpen,
    setOpen: state.setSettingsOpen,
    voroforce: state.voroforce,
    userConfig: state.userConfig,
    setUserConfig: state.setUserConfig,
    setPlayedIntro: state.setPlayedIntro,
    setAboutOpen: state.setAboutOpen,
    canChangeTheme:
      state.preset === VOROFORCE_PRESET.minimal ||
      state.preset === VOROFORCE_PRESET.mobile,
  }))

  const { theme, setTheme } = useTheme()

  const [fullscreen, setFullscreen] = useState(false)
  const [movieFilters, setMovieFilters] = useState({
    genre: userConfig.movieFilters?.genre ?? ALL_FILTER_VALUE,
    yearFrom: userConfig.movieFilters?.yearFrom?.toString() ?? '',
    yearTo: userConfig.movieFilters?.yearTo?.toString() ?? '',
    length: userConfig.movieFilters?.length ?? ALL_FILTER_VALUE,
  })

  const applyMovieFilters = () => {
    const yearFrom = Number.parseInt(movieFilters.yearFrom, 10)
    const yearTo = Number.parseInt(movieFilters.yearTo, 10)
    const nextUserConfig = {
      ...userConfig,
      movieFilters: {
        ...(movieFilters.genre !== ALL_FILTER_VALUE && {
          genre: movieFilters.genre,
        }),
        ...(Number.isFinite(yearFrom) && { yearFrom }),
        ...(Number.isFinite(yearTo) && { yearTo }),
        ...(movieFilters.length !== ALL_FILTER_VALUE && {
          length: movieFilters.length as MovieLengthFilter,
        }),
      },
    }
    setUserConfig(nextUserConfig)
    setPlayedIntro(true)
    reloadWithoutIntro()
  }

  const clearMovieFilters = () => {
    const nextUserConfig = { ...userConfig }
    nextUserConfig.movieFilters = undefined
    setUserConfig(nextUserConfig)
    setPlayedIntro(true)
    reloadWithoutIntro()
  }

  return (
    <Modal
      rootProps={{
        open: open,
        onClose: () => setOpen(false),
      }}
      overlay
      footer={
        <div className='cinematic-surface flex w-full flex-row justify-between gap-3 rounded-none border-x-0 border-b-0 p-4 md:px-6'>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            variant='outline'
            onClick={() => {
              setPlayedIntro(true)
              reloadWithoutIntro()
            }}
          >
            <RotateCw />
            Reshuffle
          </Button>
        </div>
      }
    >
      <ScrollArea
        className='not-landscape:w-full lg:w-full landscape:h-full'
        innerClassName='max-h-[calc(100vh-var(--spacing)*12)]'
      >
        <div className='flex w-full flex-col gap-4 p-4 pb-24 md:gap-5 md:p-6 md:pb-24'>
          <div className='flex items-start justify-between gap-4 border-white/10 border-b pb-5'>
            <div>
              <div className='panel-kicker mb-2'>Tune the experience</div>
              <h2 className='panel-title'>Discovery settings</h2>
              <p className='panel-description mt-1'>
                Adjust the movie pool and how the gallery behaves.
              </p>
            </div>
            <SlidersHorizontal className='mt-1 size-5 text-primary' />
          </div>
          <SmallScreenWarning />
          <section className='panel-section'>
            <div className='mb-4'>
              <h3 className='font-semibold'>Render profile</h3>
              <p className='mt-1 text-muted-foreground text-sm'>
                The recommended profile is selected automatically for this
                device.
              </p>
            </div>
            <div className='flex items-center justify-between rounded-md border border-white/8 bg-black/10 p-3'>
              <span className='text-sm'>Balanced device profile</span>
              <Badge variant='outline' className='text-primary'>
                Active
              </Badge>
            </div>
            <CoreSettingsWidget onSubmit={() => window.location.reload()} />
          </section>
          <section className='panel-section'>
            <div className='mb-4'>
              <h3 className='font-semibold'>Movie filters</h3>
              <p className='mt-1 text-muted-foreground text-sm'>
                Narrow the collection before reshuffling the canvas.
              </p>
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label>Genre</Label>
                <Select
                  value={movieFilters.genre}
                  onValueChange={(genre) =>
                    setMovieFilters((filters) => ({ ...filters, genre }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Any genre</SelectItem>
                    {MOVIE_FILTER_GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>Length</Label>
                <Select
                  value={movieFilters.length}
                  onValueChange={(length) =>
                    setMovieFilters((filters) => ({ ...filters, length }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Any length</SelectItem>
                    <SelectItem value='short'>Under 90m</SelectItem>
                    <SelectItem value='feature'>90-149m</SelectItem>
                    <SelectItem value='long'>150m+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label htmlFor='movie-year-from'>From</Label>
                  <Input
                    id='movie-year-from'
                    inputMode='numeric'
                    placeholder='Year'
                    value={movieFilters.yearFrom}
                    onChange={(event) =>
                      setMovieFilters((filters) => ({
                        ...filters,
                        yearFrom: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='movie-year-to'>To</Label>
                  <Input
                    id='movie-year-to'
                    inputMode='numeric'
                    placeholder='Year'
                    value={movieFilters.yearTo}
                    onChange={(event) =>
                      setMovieFilters((filters) => ({
                        ...filters,
                        yearTo: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className='flex items-end gap-2 md:justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={clearMovieFilters}
                >
                  Clear
                </Button>
                <Button type='button' onClick={applyMovieFilters}>
                  Apply
                </Button>
              </div>
              <p className='text-muted-foreground text-xs md:col-span-2'>
                Applying filters reshuffles the grid.
              </p>
            </div>
          </section>
          <section className='panel-section'>
            <div className='mb-4'>
              <h3 className='font-semibold'>Display and tools</h3>
              <p className='mt-1 text-muted-foreground text-sm'>
                Interface preferences for this browser.
              </p>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              {canChangeTheme && (
                <div className='flex flex-row items-center justify-between rounded-md border border-white/8 bg-black/10 p-3'>
                  <Label htmlFor='light-mode'>Bright mode</Label>
                  <Switch
                    id='light-mode'
                    checked={theme === THEME.light}
                    onCheckedChange={(checked) => {
                      setTheme(checked ? THEME.light : THEME.dark)
                    }}
                  />
                </div>
              )}
              <div className='flex flex-row items-center justify-between rounded-md border border-white/8 bg-black/10 p-3 max-md:hidden'>
                <Label htmlFor='dev-tools'>Dev tools</Label>
                <Switch
                  id='dev-tools'
                  checked={Boolean(userConfig.devTools)}
                  onCheckedChange={(checked) => {
                    userConfig.devTools = checked
                    setUserConfig(userConfig)
                    if (checked) {
                      voroforce?.initDevTools(true)
                    } else {
                      voroforce?.disposeDevTools()
                    }
                  }}
                />
              </div>
              <div className='flex flex-row items-center justify-between rounded-md border border-white/8 bg-black/10 p-3 max-md:hidden'>
                <Label htmlFor='fullscreen'>Fullscreen</Label>
                <Switch
                  id='fullscreen'
                  checked={fullscreen}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const el = document.documentElement
                      const onFullscreenChange = () => {
                        if (!document.fullscreenElement) {
                          setFullscreen(false)
                        }
                        el.removeEventListener(
                          'fullscreenchange',
                          onFullscreenChange,
                        )
                      }
                      el.requestFullscreen({ navigationUI: 'show' })
                        .then(() => {
                          setFullscreen(true)
                          el.addEventListener(
                            'fullscreenchange',
                            onFullscreenChange,
                          )
                        })
                        .catch((err) => {
                          alert(
                            `An error occurred while trying to switch into fullscreen mode: ${err.message} (${err.name})`,
                          )
                        })
                    } else {
                      if (document.fullscreenElement) {
                        document.exitFullscreen().then(() => {
                          setFullscreen(false)
                        })
                      } else {
                        setFullscreen(false)
                      }
                    }
                  }}
                />
              </div>
              <Button
                type='button'
                variant='outline'
                className='justify-start'
                onClick={() => {
                  setOpen(false)
                  setAboutOpen(true)
                }}
              >
                <Info />
                About and controls
              </Button>
            </div>
          </section>
        </div>
      </ScrollArea>
    </Modal>
  )
}
