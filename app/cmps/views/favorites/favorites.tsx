import { useShallowState } from '@/store'
import { Heart, MapPin, Trash } from 'lucide-react'
import { lazy } from 'react'
import { cn } from '../../../utils/tw'
import { Modal } from '../../common/modal'
import { StdLinks } from '../../common/standard-links'
import { Button } from '../../ui/button'
import { ScrollArea } from '../../ui/scroll-area'
import { FilmPoster } from '../film/shared/film-poster'

const CustomLinks = lazy(() =>
  import('../../common/custom-links').then((module) => ({
    default: module.CustomLinks,
  })),
)

export const Favorites = () => {
  const {
    open,
    setOpen,
    userConfig,
    setUserConfig,
    favorites,
    hasCustomLinks,
    voroforceControls,
  } = useShallowState((state) => ({
    open: state.favoritesOpen,
    setOpen: state.setFavoritesOpen,
    userConfig: state.userConfig,
    setUserConfig: state.setUserConfig,
    favorites: state.userConfig.favorites,
    hasCustomLinks:
      state.userConfig.customLinks && state.userConfig.customLinks.length > 0,
    voroforceControls: state.voroforce?.controls,
  }))

  const hasFavorites = favorites && Object.keys(favorites).length > 0

  return (
    <Modal
      rootProps={{
        open: open,
        onClose: () => setOpen(false),
      }}
      overlay
      footer={
        <div className='cinematic-surface flex w-full flex-row justify-between gap-3 rounded-none border-x-0 border-b-0 p-4 md:px-6'>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Close
          </Button>
          {hasFavorites && (
            <Button
              variant='outline'
              onClick={() => {
                userConfig.favorites = undefined
                setUserConfig(userConfig)
              }}
            >
              Clear favorites
            </Button>
          )}
        </div>
      }
    >
      <ScrollArea
        className='not-landscape:w-full lg:w-full landscape:h-full'
        innerClassName='max-h-[calc(100vh-var(--spacing)*12)]'
      >
        <div className='flex min-h-64 w-full flex-col gap-3 p-4 pb-24 md:p-6 md:pb-24'>
          <div className='mb-2 flex items-start justify-between gap-4 border-white/10 border-b pb-5'>
            <div>
              <div className='panel-kicker mb-2'>Saved for later</div>
              <h2 className='panel-title'>Favorites</h2>
              <p className='panel-description mt-1'>
                Return to saved films or jump back to their canvas position.
              </p>
            </div>
            <Heart className='mt-1 size-5 text-primary' />
          </div>
          {hasFavorites ? (
            <>
              {Object.entries(favorites ?? {}).map(([key, film]) => (
                <div
                  className='group relative flex min-h-32 w-full cursor-auto flex-row overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] transition-colors hover:border-white/18 hover:bg-white/[0.055]'
                  key={key}
                >
                  <FilmPoster
                    film={film}
                    className='w-22 shrink-0 object-cover md:w-24'
                  />
                  <div className='flex min-w-0 grow flex-col justify-between gap-3 p-3 md:p-4'>
                    <div className='pr-14'>
                      <h6 className='line-clamp-2 font-semibold text-lg leading-tight md:text-xl'>
                        {film.title}
                      </h6>
                      <div className='mt-1 text-muted-foreground text-xs'>
                        {film.year}
                      </div>
                      <p className='mt-2 line-clamp-1 hidden text-muted-foreground text-sm md:inline-block'>
                        {film.tagline}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'pointer-events-auto flex flex-row flex-wrap gap-1.5',
                      )}
                    >
                      <StdLinks
                        film={film}
                        buttonClassName='text-xxs !py-1 !px-2 !h-7'
                      />
                      {hasCustomLinks && (
                        <CustomLinks
                          film={film}
                          addNewDisabled
                          buttonClassName='!py-1 !px-2 !h-7'
                        />
                      )}
                    </div>
                  </div>
                  <div className='absolute top-3 right-3 flex flex-row gap-1'>
                    {film.cellId && voroforceControls && (
                      <Button
                        size='icon'
                        aria-label={`Jump to ${film.title}`}
                        title='Jump to canvas position'
                        variant='ghost'
                        className='!size-7 [&_svg]:!size-3.5 cursor-pointer rounded-md'
                        onClick={() => {
                          voroforceControls.navigateToCellById(film.cellId)
                        }}
                      >
                        <MapPin />
                      </Button>
                    )}
                    <Button
                      size='icon'
                      aria-label={`Remove ${film.title} from favorites`}
                      title='Remove favorite'
                      variant='ghost'
                      className='!size-7 [&_svg]:!size-3.5 cursor-pointer rounded-md text-white/55 hover:text-red-300'
                      onClick={() => {
                        delete favorites?.[Number.parseInt(key)]
                        userConfig.favorites = { ...favorites }
                        setUserConfig(userConfig)
                      }}
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className='flex min-h-64 w-full flex-1 flex-col items-center justify-center rounded-lg border border-white/8 border-dashed text-center'>
              <Heart className='mb-4 size-6 text-primary/70' />
              <div className='font-semibold'>No favorites yet</div>
              <p className='mt-1 max-w-64 text-muted-foreground text-sm'>
                Open a movie and use the heart action to save it here.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Modal>
  )
}
