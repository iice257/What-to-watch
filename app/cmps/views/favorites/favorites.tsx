import { useShallowState } from '@/store'
import { MapPin, Trash } from 'lucide-react'
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
        <div className='flex w-full flex-row justify-between gap-3 p-4 md:gap-6 md:p-6'>
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
        className='not-landscape:w-full bg-background/60 lg:w-full landscape:h-full'
        innerClassName='max-h-[calc(100vh-var(--spacing)*12)]'
      >
        <div className='flex min-h-64 w-full flex-col gap-4 p-4 pb-18 md:gap-6 md:p-6 md:pb-24 lg:flex lg:pt-16 lg:pb-24'>
          {userConfig.favorites ? (
            <>
              {Object.entries(userConfig.favorites).map(([key, film]) => (
                <div
                  className='relative flex h-36 w-full cursor-auto flex-row overflow-hidden rounded-xl border'
                  key={key}
                >
                  <FilmPoster film={film} />
                  <div className='flex h-full grow flex-col justify-between gap-3 p-4'>
                    <h6 className='pr-3 font-black text-2xl leading-none'>
                      {film.title}
                      <span className='font-normal text-foreground/50'>
                        &nbsp;({film.year})
                      </span>
                    </h6>
                    <p className='line-clamp-1 hidden font-medium text-base text-foreground/90 leading-none md:inline-block'>
                      {film.tagline}
                    </p>
                    <div
                      className={cn(
                        'pointer-events-auto flex flex-row flex-wrap gap-1.5',
                      )}
                    >
                      <StdLinks
                        film={film}
                        buttonClassName='text-xxs !py-1 !px-2 !h-auto'
                      />
                      {hasCustomLinks && (
                        <CustomLinks
                          film={film}
                          addNewDisabled
                          buttonClassName='!py-1 !px-2 !h-auto'
                        />
                      )}
                    </div>
                  </div>
                  <div className='absolute top-4 right-4 flex flex-row gap-2'>
                    {film.cellId && voroforceControls && (
                      <Button
                        size='icon'
                        className='!size-6 [&_svg]:!size-4 cursor-pointer rounded-full'
                        onClick={() => {
                          voroforceControls.navigateToCellById(film.cellId)
                        }}
                      >
                        <MapPin />
                      </Button>
                    )}
                    <Button
                      size='icon'
                      className='!size-6 [&_svg]:!size-4 cursor-pointer rounded-full'
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
            <div className='flex h-full w-full flex-1 items-center justify-center text-lg'>
              No favourites
            </div>
          )}
        </div>
      </ScrollArea>
    </Modal>
  )
}
