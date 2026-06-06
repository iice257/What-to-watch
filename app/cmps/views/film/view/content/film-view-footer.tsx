import { Heart, HeartOff, Plus, X } from 'lucide-react'
import type { DialogProps } from 'vaul'
import { useShallowState } from '../../../../../store'
import { cn } from '../../../../../utils/tw'
import type { Film, VoroforceCell } from '../../../../../vf'
import { CustomLinks } from '../../../../common/custom-links'
import { StdLinks } from '../../../../common/standard-links'
import { Button } from '../../../../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../ui/tooltip'

export const FilmViewFooter = ({
  film,
  voroforceCell,
  className = '',
  handleClose,
  direction,
}: {
  film?: Film
  voroforceCell?: VoroforceCell
  className?: string
  handleClose?: () => void
  direction: DialogProps['direction']
}) => {
  const { userConfig, setUserConfig, isFavorite, setAddCustomLinkTypeOpen } =
    useShallowState((state) => ({
      userConfig: state.userConfig,
      setUserConfig: state.setUserConfig,
      isFavorite: film && state.userConfig?.favorites?.[film.tmdbId],
      setAddCustomLinkTypeOpen: state.setAddCustomLinkTypeOpen,
    }))

  if (!film) return
  return (
    <div
      className={cn(
        'cinematic-surface relative flex w-full flex-row justify-between gap-2 rounded-none border-x-0 border-b-0 px-4 py-3 md:px-6',
        className,
        {},
      )}
    >
      <div className={cn('pointer-events-auto flex min-w-0 flex-row gap-2')}>
        <StdLinks film={film} />
        <CustomLinks film={film} />
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='icon'
                className={cn('hidden cursor-pointer md:inline-flex')}
                variant='outline'
                aria-label='Add custom link type'
                title='Add custom link type'
                // onClick={toggleAddCustomLinkTypeOpen}
                onClick={() => setAddCustomLinkTypeOpen(direction)}
              >
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add new link type</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className='pointer-events-auto flex flex-row gap-3'>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='icon'
                variant={isFavorite ? 'default' : 'outline'}
                aria-label={
                  isFavorite ? 'Remove from favorites' : 'Add to favorites'
                }
                onClick={() => {
                  if (isFavorite) {
                    delete userConfig.favorites?.[film.tmdbId]
                  } else {
                    if (!userConfig.favorites) userConfig.favorites = {}
                    userConfig.favorites[film.tmdbId] = {
                      cellId: voroforceCell?.id,
                      imdbId: film.imdbId,
                      tmdbId: film.tmdbId,
                      title: film.title,
                      tagline: film.tagline,
                      year: film.year,
                      poster: film.poster,
                    }
                  }
                  setUserConfig(userConfig)
                }}
                className='pointer-events-auto hidden md:inline-flex'
              >
                {isFavorite ? <HeartOff /> : <Heart />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          variant='outline'
          onClick={handleClose}
          size='icon'
          aria-label='Close details'
          title='Close details'
          className='pointer-events-auto'
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
