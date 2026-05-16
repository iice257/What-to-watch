import { TabletSmartphone } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../../../utils/tw'
import { DEVICE_CLASS, DEVICE_CLASS_ITEMS } from '../../../vf/consts'
import { Badge } from '../../ui/badge'
import { Selector, type SelectorItems } from '../selector'

export function DeviceClassSelector({
  className = '',
  value,
  estimatedValue,
  onValueChange,
}: {
  className?: string
  value?: DEVICE_CLASS
  estimatedValue?: DEVICE_CLASS
  onValueChange: (value: DEVICE_CLASS) => void
}) {
  const deviceClassItems: SelectorItems = useMemo(() => {
    return DEVICE_CLASS_ITEMS.filter((deviceClass) => {
      if (estimatedValue === DEVICE_CLASS.mobile) {
        return deviceClass.id < DEVICE_CLASS.high
      }
      return deviceClass.id !== DEVICE_CLASS.mobile
    }).map((deviceClass) => {
      return {
        label: deviceClass.name,
        value: String(deviceClass.id),
        addon:
          estimatedValue === deviceClass.id ? (
            <Badge className='-translate-x-1/2 -translate-y-1/2 !text-background pointer-events-none absolute top-0 left-1/2 text-xxs'>
              Estimated
            </Badge>
          ) : null,
      }
    })
  }, [estimatedValue])

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-2 font-semibold text-xl text-zinc-900 dark:text-white'>
        <TabletSmartphone className='h-5 w-5 text-zinc-900 dark:text-white' />
        Your device
      </div>
      <Selector
        key={value}
        className={cn('', className)}
        defaultValue={String(value)}
        onValueChange={(value) => {
          onValueChange(Number.parseInt(value) as DEVICE_CLASS)
        }}
        items={deviceClassItems}
      />
    </div>
  )
}
