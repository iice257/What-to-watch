import config from '../../config'
import { cn } from '../../utils/tw'
import type { Film } from '../../vf'
import { Button } from '../ui/button'

export const StdLinks = ({
  film,
  buttonClassName = '',
}: {
  film: {
    title: Film['title']
    tmdbId: Film['tmdbId']
    imdbId?: Film['imdbId']
  }
  buttonClassName?: string
}) => {
  return (
    <>
      <Button
        asChild
        variant='outline'
        className={cn(
          'rounded-lg border-foreground md:backdrop-blur-lg',
          buttonClassName,
        )}
      >
        <a
          href={`${config.tmdbFilmBaseUrl}${film.tmdbId}`}
          target='_blank'
          rel='noreferrer'
        >
          TMDB
        </a>
      </Button>
      {film.imdbId && (
        <Button
          asChild
          variant='outline'
          className={cn(
            'rounded-lg border-foreground md:backdrop-blur-lg',
            buttonClassName,
          )}
        >
          <a
            href={`${config.imdbFilmBaseUrl}${film.imdbId}`}
            target='_blank'
            rel='noreferrer'
          >
            IMDB
          </a>
        </Button>
      )}
    </>
  )
}
