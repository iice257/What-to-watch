import { useCallback, useEffect, useRef, useState } from 'react'

import { TriangleAlert } from 'lucide-react'
import { useMediaQuery } from '../../../hooks/use-media-query'
import { useShallowState } from '../../../store'
import { orientation, up } from '../../../utils/mq'
import { cn } from '../../../utils/tw'
import { CELL_LIMIT, VOROFORCE_PRESET } from '../../../vf'
import { DEVICE_CLASS, VOROFORCE_MODE } from '../../../vf/consts'
import { CoreSettingsWidget } from '../../common/core-settings/core-settings-widget'
import { Modal } from '../../common/modal'
import { Button } from '../../ui/button'

export const LowFpsAlert = () => {
  const landscape = useMediaQuery(orientation('landscape'))
  const isLgScreen = useMediaQuery(up('lg'))

  const {
    performanceMonitor,
    preset,
    ticker,
    mode,
    deviceClass,
    estimatedDeviceClass,
    setEstimatedDeviceClass,
    setAboutOpen,
    setSettingsOpen,
    cellLimit,
  } = useShallowState((state) => ({
    performanceMonitor: state.performanceMonitor,
    preset: state.preset,
    ticker: state.voroforce?.ticker,
    mode: state.mode,
    deviceClass: state.deviceClass,
    estimatedDeviceClass: state.estimatedDeviceClass,
    setEstimatedDeviceClass: state.setEstimatedDeviceClass,
    setAboutOpen: state.setAboutOpen,
    setSettingsOpen: state.setSettingsOpen,
    cellLimit: state.userConfig.cells,
  }))

  const canLowerQuality = preset
    ? [VOROFORCE_PRESET.contours, VOROFORCE_PRESET.depth].includes(preset) ||
      (deviceClass === DEVICE_CLASS.mobile &&
        preset !== VOROFORCE_PRESET.mobile) ||
      (cellLimit &&
        cellLimit >
          (deviceClass === DEVICE_CLASS.mobile
            ? CELL_LIMIT.xxs
            : CELL_LIMIT.xs))
    : false
  const warnLimit = !canLowerQuality ? 1 : 2

  const [isOpen, setIsOpen] = useState(false)
  const [openedCount, setOpenedCount] = useState(0)
  const [alignContentToBottom, setAlignContentToBottom] = useState(false)
  const [cooldown, setCooldown] = useState(true)

  const cooldownTimeoutRef = useRef<NodeJS.Timeout>(null)

  const open = useCallback(() => {
    if (!ticker) return
    if (cooldown) {
      if (!cooldownTimeoutRef.current) {
        setTimeout(() => {
          setCooldown(false)
          cooldownTimeoutRef.current = null
        }, 30000)
      }
      return
    }
    if (!isLgScreen) {
      setAboutOpen(false)
      setSettingsOpen(false)
    }

    switch (estimatedDeviceClass) {
      case DEVICE_CLASS.high:
        setEstimatedDeviceClass(DEVICE_CLASS.mid)
        break
      case DEVICE_CLASS.mid:
        setEstimatedDeviceClass(DEVICE_CLASS.low)
        break
    }

    ticker.freeze()
    setIsOpen(true)
    setOpenedCount((opened) => opened + 1)
    setCooldown(true)
  }, [
    ticker,
    estimatedDeviceClass,
    setEstimatedDeviceClass,
    isLgScreen,
    setAboutOpen,
    setSettingsOpen,
    cooldown,
  ])

  const close = useCallback(() => {
    setIsOpen(false)
    if (!ticker) return
    ticker.unfreeze()
  }, [ticker])

  useEffect(() => {
    if (performanceMonitor && openedCount < warnLimit) {
      return performanceMonitor.subscribe({
        onDecline: () => {
          console.log('fps decline')
          open()
        },
      })
    }
  }, [performanceMonitor, openedCount, warnLimit, open])

  useEffect(() => {
    setAlignContentToBottom(mode === VOROFORCE_MODE.select && isLgScreen)
  }, [mode, isLgScreen])

  return (
    <Modal
      rootProps={{
        direction: landscape ? 'left' : 'bottom',
        open: isOpen,
        onClose: close,
      }}
      contentProps={{
        className: cn(
          'max-md:landscape:min-w-auto max-md:landscape:max-w-1/2',
          {
            'landscape:!top-auto landscape:!bottom-0': alignContentToBottom,
          },
        ),
      }}
      innerContentProps={{
        className: 'max-md:!bg-background/90',
      }}
      overlay={true}
    >
      <div className='flex flex-col p-4 md:p-6 lg:p-9 max-md:landscape:h-full max-md:landscape:justify-between'>
        <div className='flex flex-col gap-2 pt-4'>
          <div className='flex items-center gap-2 font-semibold text-xl text-zinc-900 dark:text-white'>
            <TriangleAlert className='h-5 w-5 text-amber-500 ' />
            <div>Low FPS detected</div>
          </div>
          <p className='inline-flex pb-2 text-base text-zinc-600 max-md:pb-2 dark:text-zinc-300'>
            <span className='leading-none md:hidden'>
              This page is best viewed on a larger device like a desktop or
              laptop.
            </span>
            <span
              className={cn('max-md:hidden', {
                hidden: canLowerQuality,
              })}
            >
              Lower the settings?
            </span>
            <span
              className={cn('max-md:hidden', {
                hidden: !canLowerQuality,
              })}
            >
              You're already using the lowest settings.
            </span>
          </p>
        </div>
        <CoreSettingsWidget onSubmit={() => window.location.reload()} />
        <div className='flex w-full flex-row justify-end gap-3 pt-4 md:gap-6 md:pt-6'>
          <Button variant='outline' onClick={close}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
