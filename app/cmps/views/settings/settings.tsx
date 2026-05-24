import { useShallowState } from '@/store'
import { useState } from 'react'
import { THEME } from '../../../consts'
import { reload } from '../../../utils/misc'
import { VOROFORCE_PRESET } from '../../../vf'
import { MOVIE_FILTER_GENRES } from '../../../vf/data/movie-filter-index'
import type { MovieLengthFilter } from '../../../vf/utils'
import { CoreSettingsWidget } from '../../common/core-settings/core-settings-widget'
import { Modal } from '../../common/modal'
import { SmallScreenWarning } from '../../common/small-screen-warning'
import { useTheme } from '../../layout'
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
const MOVIE_FILTER_REGIONS = [
  'United States of America',
  'United Kingdom',
  'Canada',
  'France',
  'Japan',
  'South Korea',
  'India',
  'Germany',
  'Italy',
  'Spain',
  'China',
  'Hong Kong',
  'Brazil',
  'Australia',
]

export const Settings = () => {
  const {
    open,
    setOpen,
    voroforce,
    userConfig,
    setUserConfig,
    setPlayedIntro,
    voroforceDevSceneEnabled,
    setVoroforceDevSceneEnabled,
    canChangeTheme,
  } = useShallowState((state) => ({
    open: state.settingsOpen,
    setOpen: state.setSettingsOpen,
    voroforce: state.voroforce,
    userConfig: state.userConfig,
    setUserConfig: state.setUserConfig,
    setPlayedIntro: state.setPlayedIntro,
    voroforceDevSceneEnabled: state.voroforceDevSceneEnabled,
    setVoroforceDevSceneEnabled: state.setVoroforceDevSceneEnabled,
    canChangeTheme:
      state.preset === VOROFORCE_PRESET.minimal ||
      state.preset === VOROFORCE_PRESET.mobile,
  }))

  const { theme, setTheme } = useTheme()

  const [fullscreen, setFullscreen] = useState(false)
  const [movieFilters, setMovieFilters] = useState({
    genre: userConfig.movieFilters?.genre ?? ALL_FILTER_VALUE,
    region: userConfig.movieFilters?.region ?? ALL_FILTER_VALUE,
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
        ...(movieFilters.region !== ALL_FILTER_VALUE && {
          region: movieFilters.region,
        }),
        ...(Number.isFinite(yearFrom) && { yearFrom }),
        ...(Number.isFinite(yearTo) && { yearTo }),
        ...(movieFilters.length !== ALL_FILTER_VALUE && {
          length: movieFilters.length as MovieLengthFilter,
        }),
      },
    }
    setUserConfig(nextUserConfig)
    reload()
  }

  const clearMovieFilters = () => {
    const nextUserConfig = { ...userConfig }
    nextUserConfig.movieFilters = undefined
    setUserConfig(nextUserConfig)
    reload()
  }

  return (
    <Modal
      rootProps={{
        open: open,
        onClose: () => setOpen(false),
      }}
      overlay
      footer={
        <div className='flex w-full flex-row justify-between gap-3 p-4 md:gap-6 md:p-6'>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            variant='outline'
            onClick={() => {
              setPlayedIntro(false)
              reload()
            }}
          >
            Replay Intro
          </Button>
        </div>
      }
    >
      <ScrollArea
        className='not-landscape:w-full bg-background/60 lg:w-full landscape:h-full'
        innerClassName='max-h-[calc(100vh-var(--spacing)*12)]'
      >
        <div className='flex w-full flex-col gap-4 p-4 pb-18 md:gap-6 md:p-6 md:pr-10 md:pb-24 lg:pt-12 lg:pb-24'>
          <SmallScreenWarning />
          <CoreSettingsWidget onSubmit={() => window.location.reload()} />
          <div className='grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_0.9fr_auto] md:items-end'>
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
              <Label>Region</Label>
              <Select
                value={movieFilters.region}
                onValueChange={(region) =>
                  setMovieFilters((filters) => ({ ...filters, region }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Any region</SelectItem>
                  {MOVIE_FILTER_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className='flex gap-2 md:justify-end'>
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
          </div>
          <div className='flex flex-row flex-wrap gap-6'>
            {canChangeTheme && (
              <div className='flex flex-row items-center gap-2'>
                <Switch
                  id='light-mode'
                  checked={theme === THEME.light}
                  onCheckedChange={(checked) => {
                    setTheme(checked ? THEME.light : THEME.dark)
                  }}
                />
                <Label htmlFor='light-mode'>Bright mode</Label>
              </div>
            )}
            <div className='flex flex-row items-center gap-2 max-md:hidden'>
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
              <Label htmlFor='dev-tools'>Dev tools</Label>
            </div>
            <div className='flex flex-row items-center gap-2'>
              <Switch
                id='show-cell-seeds'
                checked={voroforceDevSceneEnabled}
                onCheckedChange={(checked) => {
                  setVoroforceDevSceneEnabled(checked)
                }}
              />
              <Label htmlFor='show-cell-seeds'>Cell seeds</Label>
            </div>
            <div className='flex flex-row items-center gap-2 max-md:hidden'>
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
              <Label htmlFor='fullscreen'>Fullscreen</Label>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Modal>
  )
}
