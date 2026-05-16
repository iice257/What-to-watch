import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip'

import type { ReactNode } from 'react'
import { cn } from '../../../utils/tw'
import downIcon from './assets/down.svg'
import enterIcon from './assets/enter.svg'
// Import SVG assets as URLs
import escIcon from './assets/esc.svg'
import leftIcon from './assets/left.svg'
import mouseImg from './assets/mouse.png'
import rightIcon from './assets/right.svg'
import spaceIcon from './assets/spacebar.svg'
import upIcon from './assets/up.svg'

interface HotkeyItemProps {
  icon: string
  description: string
}

const HotkeyItem = ({
  icon,
  description,
  className = '',
  imgClassName = '',
  overlay,
}: HotkeyItemProps & {
  className?: string
  imgClassName?: string
  overlay?: ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div
        className={cn(
          'relative flex aspect-square cursor-pointer items-center justify-center transition-opacity hover:opacity-70',
          className,
        )}
      >
        <img
          src={icon}
          alt={description}
          className={cn('h-full w-full', imgClassName)}
        />
        {overlay && (
          <div className='absolute inset-0 flex size-full items-center justify-center text-background'>
            {overlay}
          </div>
        )}
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>{description}</p>
    </TooltipContent>
  </Tooltip>
)

export const Hotkeys = ({ className }: { className?: string }) => {
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn('flex flex-row items-center gap-2', className)}>
        <div
          className='grid w-full max-w-lg grid-cols-10 grid-rows-2 gap-1'
          style={{ aspectRatio: '10/2' }}
        >
          {/* ESC - Left side of row 1 */}
          <HotkeyItem
            icon={escIcon}
            description='Close current view or modal'
            className='col-start-1 row-start-1'
            imgClassName='-mb-2'
          />

          {/* Enter - Right side (2x2) */}
          <HotkeyItem
            icon={enterIcon}
            description='Toggle view mode'
            className='col-span-2 col-start-9 row-span-2 row-start-1 justify-start'
            imgClassName='object-contain w-auto h-[103%] -ml-3.75'
          />

          {/* Arrow keys - Top center */}
          <HotkeyItem
            icon={upIcon}
            description='Navigate up'
            className='col-start-7 row-start-1'
            imgClassName='-mb-2'
          />
          <HotkeyItem
            icon={leftIcon}
            description='Navigate left'
            className='col-start-6 row-start-2'
          />
          <HotkeyItem
            icon={downIcon}
            description='Navigate down'
            className='col-start-7 row-start-2'
          />
          <HotkeyItem
            icon={rightIcon}
            description='Navigate right'
            className='col-start-8 row-start-2'
          />

          {/* Spacebar - Bottom Left (wide) */}
          <HotkeyItem
            icon={spaceIcon}
            description='Toggle view mode'
            className='!aspect-auto col-span-5 col-start-1 row-start-2'
            imgClassName='h-full w-full'
            overlay={
              <h3 className='mb-2 font-semibold text-xs'>Keyboard Shortcuts</h3>
            }
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <img
              src={mouseImg}
              className='h-28 w-auto cursor-pointer grayscale hover:opacity-70'
              alt='mouse'
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>
              <b>Click</b>: Toggle view mode
              <br />
              <b>Wheel</b>: Zoom in/out
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
