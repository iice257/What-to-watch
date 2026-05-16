import { Copy, X } from 'lucide-react'
import { useState } from 'react'
import slugify from 'slugify'
import { useShallowState } from '../../store'
import { cn } from '../../utils/tw'
import type { Film } from '../../vf'
import { Button } from '../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'

export const CustomLinks = ({
  film,
  buttonClassName = '',
}: {
  film: {
    title: Film['title']
    tmdbId: Film['tmdbId']
    imdbId?: Film['imdbId']
  }
  className?: string
  buttonClassName?: string
  addNewDisabled?: boolean
}) => {
  const { userConfig, setUserConfig, customLinks } = useShallowState(
    (state) => ({
      userConfig: state.userConfig,
      setUserConfig: state.setUserConfig,
      customLinks: state.userConfig.customLinks,
    }),
  )

  const [copiedCustomLink, setCopiedCustomLink] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      {customLinks?.map(({ name, baseUrl, slug, property }, index) => (
        <Button
          asChild
          key={baseUrl}
          variant='outline'
          className={cn(
            'rounded-lg border-foreground md:backdrop-blur-lg',
            buttonClassName,
          )}
        >
          <div className='group relative'>
            <a
              href={`${baseUrl}${(slug ? (v: string) => slugify(v).toLowerCase() : (v: string) => v)(String(film[property]))}`}
              target='_blank'
              rel='noreferrer noopener'
            >
              {name}
            </a>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='icon'
                  variant='unstyled'
                  className='-bottom-2 -end-2 absolute inline-flex size-5 items-center justify-center rounded-full border border-white bg-blue-500 font-bold text-white text-xs opacity-0 transition-opacity duration-300 group-hover:opacity-100'
                  onClick={() => {
                    void navigator?.clipboard?.writeText(
                      `${window.location.href.split('?')[0]}?customLinkBase64=${window.btoa(
                        JSON.stringify({
                          name,
                          baseUrl,
                          slug,
                          property,
                        }),
                      )}`,
                    )
                    setCopiedCustomLink(true)
                    setTimeout(() => setCopiedCustomLink(false), 2000)
                  }}
                >
                  <Copy className='!size-3' />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                onPointerDownOutside={(event) => {
                  event.preventDefault()
                }}
                side='bottom'
              >
                {copiedCustomLink ? (
                  <p>Copied!</p>
                ) : (
                  <p>Copy to Clipboard for sharing</p>
                )}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='icon'
                  variant='unstyled'
                  className='-top-2 -end-2 absolute inline-flex size-5 items-center justify-center rounded-full border border-white bg-red-500 font-bold text-white text-xs opacity-0 transition-opacity duration-300 group-hover:opacity-100 '
                  onClick={() => {
                    userConfig.customLinks?.splice(index, 1)
                    userConfig.customLinks = [...(userConfig.customLinks ?? [])]
                    setUserConfig(userConfig)
                  }}
                >
                  <X className='!size-3' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </Button>
      ))}
    </TooltipProvider>
  )
}
