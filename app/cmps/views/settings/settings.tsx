import { useShallowState } from '@/store'
import { useState } from 'react'
import { THEME } from '../../../consts'
import { reload } from '../../../utils/misc'
import { VOROFORCE_PRESET } from '../../../vf'
import { CoreSettingsWidget } from '../../common/core-settings/core-settings-widget'
import { Modal } from '../../common/modal'
import { SmallScreenWarning } from '../../common/small-screen-warning'
import { useTheme } from '../../layout'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { ScrollArea } from '../../ui/scroll-area'
import { Switch } from '../../ui/switch'

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
