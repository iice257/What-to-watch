import { Grid3x3Icon } from 'lucide-react'
import { useMemo } from 'react'
import { isDefined } from '../../../utils/misc'
import { cn } from '../../../utils/tw'
import { CELL_LIMIT, CELL_LIMIT_ITEMS, DEVICE_CLASS } from '../../../vf/consts'
import { DeviceClassWarningMessage } from '../device-class/device-class-warning-message'
import { Selector, type SelectorItems } from '../selector'

export function CellLimitSelector({
  className = '',
  selectorClassName = '',
  selectorItemClassName = '',
  value,
  onValueChange,
  deviceClass,
}: {
  className?: string
  selectorClassName?: string
  selectorItemClassName?: string
  value?: CELL_LIMIT
  onValueChange: (value: CELL_LIMIT) => void
  deviceClass?: DEVICE_CLASS
}) {
  const cellLimitItems: SelectorItems = useMemo(() => {
    return CELL_LIMIT_ITEMS.filter(
      (cellLimit) =>
        cellLimit.value !== CELL_LIMIT.xxs ||
        deviceClass === DEVICE_CLASS.mobile,
    ).map((cellLimit) => {
      const hasWarning =
        isDefined(cellLimit.recommendedDeviceClass) &&
        isDefined(deviceClass) &&
        cellLimit.recommendedDeviceClass > deviceClass

      return {
        label: (
          <span
            className={cn({
              'text-amber-700 dark:text-amber-500': hasWarning,
            })}
          >
            {cellLimit.label}
          </span>
        ),
        value: String(cellLimit.value),
        hasWarning,
      }
    })
  }, [deviceClass])

  return (
    <div className={cn('flex flex-col gap-4 md:flex-row', className)}>
      <div className='flex items-center gap-2 font-semibold text-xl text-zinc-900 dark:text-white'>
        <Grid3x3Icon className='h-5 w-5 text-zinc-900 dark:text-white' />
        Films
      </div>
      <Selector
        className={cn('md:grow', selectorClassName)}
        itemClassName={cn(
          'flex items-center justify-center rounded-lg py-1 text-center text-sm leading-none md:text-xs xl:text-sm',
          selectorItemClassName,
        )}
        defaultValue={String(value)}
        onValueChange={(value) => {
          onValueChange(Number.parseInt(value) as CELL_LIMIT)
        }}
        items={cellLimitItems}
        warningMessage={<DeviceClassWarningMessage deviceClass={deviceClass} />}
        warningClassName='-translate-y-2/3 text-xxs leading-none'
        warningIconClassName='[&>svg]:size-3 p-1 group-hover:scale-160'
      />
    </div>
  )
}
