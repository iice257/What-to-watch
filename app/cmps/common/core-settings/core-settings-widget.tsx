import { type ReactNode, useState } from 'react'

import { THEME } from '../../../consts'
import { useMediaQuery } from '../../../hooks/use-media-query'
import { useShallowState } from '../../../store'
import { isDefined } from '../../../utils/misc'
import { down } from '../../../utils/mq'
import { cn } from '../../../utils/tw'
import { VOROFORCE_PRESET } from '../../../vf'
import {
  CELL_LIMIT,
  CELL_LIMIT_ITEMS,
  DEVICE_CLASS,
  PRESET_ITEMS,
  type PresetItem,
} from '../../../vf/consts'
import { Button, type ButtonProps } from '../../ui/button'
import { AnimateDimensionsChange } from '../animate-dimensions-change'
import { FadeTransition } from '../fade-transition'
import { CellLimitSelector } from './cell-limit-selector'
import { PresetSelector } from './preset-selector'

export function CoreSettingsWidget({
  className = '',
  onSubmit,
  submitLabel = 'Apply',
  submitProps,
  submitVisibility = 'dirty',
}: {
  className?: string
  onSubmit?: () => void
  submitLabel?: string | ReactNode
  submitProps?: ButtonProps
  submitVisibility?: 'dirty' | 'always'
}) {
  const {
    storeDeviceClass,
    estimatedDeviceClass,
    setStorePreset,
    storePreset,
    setStoreCellLimit,
    storeCellLimit,
    theme,
    setTheme,
  } = useShallowState((state) => ({
    setStorePreset: state.setPreset,
    storePreset: state.preset,
    setStoreCellLimit: state.setCellLimit,
    storeCellLimit: state.cellLimit,
    storeDeviceClass: state.deviceClass,
    estimatedDeviceClass: state.estimatedDeviceClass,
    theme: state.theme,
    setTheme: state.setTheme,
  }))

  const deviceClass = isDefined(storeDeviceClass)
    ? storeDeviceClass
    : estimatedDeviceClass

  const isSmallScreen = useMediaQuery(down('md'))

  const [preset, setPreset] = useState<VOROFORCE_PRESET | undefined>(
    storePreset ??
      (isSmallScreen
        ? deviceClass === DEVICE_CLASS.mobile
          ? VOROFORCE_PRESET.mobile
          : VOROFORCE_PRESET.minimal
        : isDefined(deviceClass)
          ? (
              PRESET_ITEMS.filter(
                (p) =>
                  !Array.isArray(p) &&
                  (p.id !== VOROFORCE_PRESET.mobile ||
                    deviceClass === DEVICE_CLASS.mobile),
              ) as PresetItem[]
            ).find((p) =>
              isDefined(p.recommendedDeviceClass)
                ? p.recommendedDeviceClass <= deviceClass
                : true,
            )?.id
          : undefined),
  )

  const [cellLimit, setCellLimit] = useState<CELL_LIMIT | undefined>(
    storeCellLimit ??
      (isSmallScreen
        ? deviceClass === DEVICE_CLASS.mobile
          ? CELL_LIMIT.xxs
          : CELL_LIMIT.xs
        : isDefined(deviceClass)
          ? CELL_LIMIT_ITEMS.findLast(
              (p) =>
                !p.doNotRecommend &&
                (isDefined(p.recommendedDeviceClass)
                  ? p.recommendedDeviceClass <= deviceClass
                  : true),
            )?.value
          : undefined),
  )

  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  return (
    <AnimateDimensionsChange
      axis='height'
      className='overflow-visible'
      innerClassName={cn('flex flex-col gap-4', className)}
    >
      <PresetSelector
        className='max-md:hidden'
        value={preset}
        onValueChange={(value: VOROFORCE_PRESET) => {
          setPreset(value)
          setIsDirty(value !== storePreset || cellLimit !== storeCellLimit)
        }}
        deviceClass={deviceClass}
      />
      <CellLimitSelector
        className='max-md:hidden'
        value={cellLimit}
        onValueChange={(value: CELL_LIMIT) => {
          setCellLimit(value)
          setIsDirty(preset !== storePreset || value !== storeCellLimit)
        }}
        deviceClass={deviceClass}
      />
      <FadeTransition
        transitionOptions={{
          initialEntered: submitVisibility === 'always',
          timeout: 0,
        }}
        visible={submitVisibility === 'always' || isDirty}
      >
        <Button
          onClick={() => {
            if (isSubmitted) return
            setIsSubmitted(true)
            const newPreset = isDefined(preset)
              ? preset
              : VOROFORCE_PRESET.minimal
            if (
              theme === THEME.light &&
              newPreset !== VOROFORCE_PRESET.minimal
            ) {
              setTheme(THEME.dark)
            }
            setStorePreset(newPreset)
            setStoreCellLimit(isDefined(cellLimit) ? cellLimit : CELL_LIMIT.sm)
            onSubmit?.()
          }}
          size='lg'
          disabled={
            !isSmallScreen && (!isDefined(preset) || !isDefined(cellLimit))
          }
          {...submitProps}
          className={cn(
            'w-full cursor-pointer text-lg',
            submitProps?.className,
          )}
        >
          {submitLabel}
        </Button>
      </FadeTransition>
    </AnimateDimensionsChange>
  )
}
