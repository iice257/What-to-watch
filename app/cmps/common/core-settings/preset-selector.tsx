import { Settings2 } from 'lucide-react'
import { useMemo } from 'react'
import { isDefined } from '../../../utils/misc'
import { cn } from '../../../utils/tw'
import { VOROFORCE_PRESET } from '../../../vf'
import { DEVICE_CLASS, PRESET_ITEMS } from '../../../vf/consts'
import { Badge } from '../../ui/badge'
import { DeviceClassWarningMessage } from '../device-class/device-class-warning-message'
import { Selector, type SelectorItems } from '../selector'

type NoArray<T> = T extends Array<unknown> ? never : T

const processPresetItem = (
  presetItem: NoArray<(typeof PRESET_ITEMS)[number]>,
  deviceClass?: DEVICE_CLASS,
) => {
  const hasWarning =
    isDefined(presetItem.recommendedDeviceClass) &&
    isDefined(deviceClass) &&
    presetItem.recommendedDeviceClass > deviceClass
  return {
    disabled: presetItem.disabled,
    label: (
      <>
        {presetItem.videoSrc && (
          <video
            className='absolute inset-0 h-full w-full object-cover object-center'
            playsInline
            autoPlay
            muted
            controls={false}
            loop
          >
            <source src={presetItem.videoSrc} type='video/webm' />
          </video>
        )}
        {presetItem.imgSrc && (
          <img
            className='absolute inset-0 h-full w-full object-cover object-center'
            src={presetItem.imgSrc}
            alt={presetItem.name}
          />
        )}
        <div
          className={cn('relative z-2', {
            'text-amber-500': hasWarning,
          })}
        >
          {presetItem.name}
        </div>
      </>
    ),
    value: presetItem.id,
    hasWarning,
    addon: presetItem.wip ? (
      <Badge
        title='Work in progress'
        className={cn(
          '-translate-x-1/2 -translate-y-1/2 !text-background -rotate-90 absolute top-1/2 left-0 z-5 cursor-pointer px-1 text-xxs',
          {
            // 'left-1/4': hasWarning,
          },
        )}
      >
        WIP
      </Badge>
    ) : undefined,
  }
}

export function PresetSelector({
  className = '',
  value,
  onValueChange,
  deviceClass,
}: {
  className?: string
  value?: VOROFORCE_PRESET
  onValueChange: (value: VOROFORCE_PRESET) => void
  deviceClass?: DEVICE_CLASS
}) {
  const presetItems: SelectorItems = useMemo(() => {
    return PRESET_ITEMS.filter((presetItem) => {
      return !(
        deviceClass !== DEVICE_CLASS.mobile &&
        !Array.isArray(presetItem) &&
        presetItem.id === VOROFORCE_PRESET.mobile
      )
    }).map((presetItem) => {
      return Array.isArray(presetItem)
        ? presetItem.map((subPresetItem) =>
            processPresetItem(subPresetItem, deviceClass),
          )
        : processPresetItem(presetItem, deviceClass)
    })
  }, [deviceClass])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className='flex items-end gap-4'>
        <div className='flex items-center gap-2 font-semibold text-xl text-zinc-900 leading-none dark:text-white'>
          <Settings2 className='h-5 w-5 text-zinc-900 dark:text-white' />
          Preset
        </div>
        {/*<p className='text-sm text-zinc-600 leading-none dark:text-zinc-300'>*/}
        {/*  You can change this later*/}
        {/*</p>*/}
      </div>
      <Selector
        itemClassName='text-white light:bg-foreground max-lg:landscape:py-1'
        itemBgClassName='z-1'
        defaultValue={value}
        onValueChange={(value) => {
          onValueChange(value as VOROFORCE_PRESET)
        }}
        items={presetItems}
        warningMessage={<DeviceClassWarningMessage deviceClass={deviceClass} />}
      />
    </div>
  )
}
