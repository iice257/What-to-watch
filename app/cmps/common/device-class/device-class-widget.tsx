import { type ReactNode, useEffect, useState } from 'react'

import { useMediaQuery } from '../../../hooks/use-media-query'
import { useShallowState } from '../../../store'
import { isDefined } from '../../../utils/misc'
import { down } from '../../../utils/mq'
import { cn } from '../../../utils/tw'
import { type DEVICE_CLASS, DEVICE_CLASS_ITEMS } from '../../../vf/consts'
import { estimateDeviceClass } from '../../../vf/utils/device-class'
import { Button, type ButtonProps } from '../../ui/button'
import { DeviceClassSelector } from './device-class-selector'

export function DeviceClassWidget({
  className = '',
  onSubmit,
  submitLabel = 'Continue',
  submitProps,
}: {
  className?: string
  onSubmit?: () => void
  submitLabel?: string | ReactNode
  submitProps?: ButtonProps
}) {
  const {
    storeDeviceClass,
    setStoreDeviceClass,
    estimatedDeviceClass,
    setEstimatedDeviceClass,
    voroforce,
  } = useShallowState((state) => ({
    storeDeviceClass: state.deviceClass,
    setStoreDeviceClass: state.setDeviceClass,
    estimatedDeviceClass: state.estimatedDeviceClass,
    setEstimatedDeviceClass: state.setEstimatedDeviceClass,
    voroforce: state.voroforce,
  }))

  const isSmallScreen = useMediaQuery(down('md'))

  const [selectedDeviceClass, setSelectedDeviceClass] = useState<
    DEVICE_CLASS | undefined
  >(
    storeDeviceClass ??
      (isSmallScreen ||
      DEVICE_CLASS_ITEMS.find((p) => p.id === estimatedDeviceClass)
        ? estimatedDeviceClass
        : undefined),
  )

  useEffect(() => {
    if (!storeDeviceClass) {
      if (estimatedDeviceClass) {
        setSelectedDeviceClass(estimatedDeviceClass)
      } else {
        if (!voroforce) {
          estimateDeviceClass().then((estimatedDeviceClass) => {
            if (isSmallScreen) {
              setStoreDeviceClass(estimatedDeviceClass)
            }
            setEstimatedDeviceClass(estimatedDeviceClass)
            setSelectedDeviceClass(estimatedDeviceClass)
          })
        }
      }
    }
  }, [
    storeDeviceClass,
    estimatedDeviceClass,
    setEstimatedDeviceClass,
    setStoreDeviceClass,
    voroforce,
    isSmallScreen,
  ])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <DeviceClassSelector
        estimatedValue={estimatedDeviceClass}
        value={selectedDeviceClass}
        onValueChange={(value: DEVICE_CLASS) => {
          setSelectedDeviceClass(value)
        }}
      />
      <Button
        onClick={() => {
          const deviceClass = isDefined(selectedDeviceClass)
            ? selectedDeviceClass
            : estimatedDeviceClass
          if (typeof deviceClass === 'number' && deviceClass >= 0) {
            setStoreDeviceClass(deviceClass)
            onSubmit?.()
          }
        }}
        size='lg'
        disabled={!isSmallScreen && !isDefined(selectedDeviceClass)}
        {...submitProps}
        className={cn('w-full cursor-pointer text-lg', submitProps?.className)}
      >
        {submitLabel}
      </Button>
    </div>
  )
}
