import { type ReactNode, useEffect } from 'react'

import { THEME } from '../../../consts'
import { useShallowState } from '../../../store'
import { cn } from '../../../utils/tw'
import { VOROFORCE_PRESET } from '../../../vf'
import { CELL_LIMIT } from '../../../vf/consts'
import { Button, type ButtonProps } from '../../ui/button'
import { AnimateDimensionsChange } from '../animate-dimensions-change'
import { FadeTransition } from '../fade-transition'

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
    theme: state.theme,
    setTheme: state.setTheme,
  }))

  useEffect(() => {
    if (storePreset !== VOROFORCE_PRESET.minimal) {
      setStorePreset(VOROFORCE_PRESET.minimal)
    }
    if (storeCellLimit !== CELL_LIMIT.xs) {
      setStoreCellLimit(CELL_LIMIT.xs)
    }
  }, [setStoreCellLimit, setStorePreset, storeCellLimit, storePreset])

  return (
    <AnimateDimensionsChange
      axis='height'
      className='overflow-visible'
      innerClassName={cn('flex flex-col gap-4', className)}
    >
      <FadeTransition
        transitionOptions={{
          initialEntered: submitVisibility === 'always',
          timeout: 0,
        }}
        visible={submitVisibility === 'always'}
      >
        <Button
          onClick={() => {
            if (theme === THEME.light) {
              setTheme(THEME.dark)
            }
            setStorePreset(VOROFORCE_PRESET.minimal)
            setStoreCellLimit(CELL_LIMIT.xs)
            onSubmit?.()
          }}
          size='lg'
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
