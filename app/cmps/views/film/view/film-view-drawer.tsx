import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { selectIsSelectMode, useShallowState } from '@/store'
import type { DialogProps } from 'vaul'
import { useMediaQuery } from '../../../../hooks/use-media-query'
import { down, orientation } from '../../../../utils/mq'
import { cn } from '../../../../utils/tw'
import type { Film, VoroforceCell } from '../../../../vf'
import { Modal } from '../../../common/modal'

const AddCustomLinkModal = lazy(() =>
  import('./content').then((module) => ({
    default: module.AddCustomLinkModal,
  })),
)

const FilmView = lazy(() =>
  import('./content').then((module) => ({ default: module.FilmView })),
)

const FilmViewFooter = lazy(() =>
  import('./content').then((module) => ({
    default: module.FilmViewFooter,
  })),
)

const getDefaultDirection = (isLandscape: boolean): DialogProps['direction'] =>
  isLandscape ? 'left' : 'top'

export const FilmViewDrawer = () => {
  const [open, setOpen] = useState(false)
  const isSmallScreen = useMediaQuery(down('md'))
  const isLandscape = useMediaQuery(orientation('landscape'))
  const [direction, setDirection] = useState(getDefaultDirection(isLandscape))
  const [mountContent, setMountContent] = useState(false)
  const [freezeFilm, setFreezeFilm] = useState(false)
  const filmRef = useRef<Film>(undefined)
  const voroforceCellRef = useRef<VoroforceCell>(undefined)

  const {
    film: activeFilm,
    isSelectMode,
    voroforce,
    exitVoroforceSelectMode,
    addCustomLinkTypeOpen,
    setAddCustomLinkTypeOpen,
  } = useShallowState((state) => ({
    film: state.film,
    isSelectMode: selectIsSelectMode(state),
    voroforce: state.voroforce,
    exitVoroforceSelectMode: state.exitSelectMode,
    addCustomLinkTypeOpen: state.addCustomLinkTypeOpen,
    setAddCustomLinkTypeOpen: state.setAddCustomLinkTypeOpen,
  }))

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  const [film, voroforceCell] = useMemo(() => {
    if (freezeFilm) return [filmRef.current, voroforceCellRef.current]
    filmRef.current = activeFilm
    voroforceCellRef.current = voroforce?.cells?.focused
    return [activeFilm, voroforceCellRef.current]
  }, [activeFilm, freezeFilm])

  useEffect(() => {
    if (mountContent) return
    const mount = () => setMountContent(true)
    if (isSelectMode) {
      mount()
    } else if (voroforce) {
      setTimeout(() => {
        mount()
      }, 5000)
    }
  }, [voroforce, isSelectMode, mountContent])

  const onClose = useCallback(() => {
    setFreezeFilm(false)
    setOpen(false)
    setAddCustomLinkTypeOpen(false)
  }, [setAddCustomLinkTypeOpen])

  const handleClose = useCallback(() => {
    exitVoroforceSelectMode()
    onClose()
  }, [exitVoroforceSelectMode, onClose])

  useEffect(() => {
    if (isSelectMode) {
      let direction = getDefaultDirection(isLandscape)
      const voroforceCell = voroforceCellRef.current
      if (voroforceCell) {
        if (isLandscape) {
          if (voroforceCell.x < window.innerWidth / (isSmallScreen ? 2 : 3)) {
            direction = 'right'
          }
        } else {
          if (voroforceCell.y < window.innerHeight / 2) {
            direction = 'bottom'
          }
        }
      }
      setDirection(direction)
      setOpen(true)
    } else {
      onClose()
    }
  }, [isSelectMode, isLandscape, isSmallScreen, onClose])

  return (
    <Modal
      rootProps={{
        direction,
        open,
        onClose: handleClose,
        modal: false,
      }}
      contentProps={{
        ...(!isSmallScreen && {
          onMouseEnter: () => setFreezeFilm(true),
          onMouseLeave: () => setFreezeFilm(false),
        }),
        className: cn(
          'group landscape:max-h-[18rem] landscape:w-2/5 md:landscape:max-h-[24rem]',
          {
            'contain-layout contain-paint contain-style':
              !addCustomLinkTypeOpen,
            'lg:landscape:pt-24': direction === 'right',
          },
        ),
      }}
      innerContentProps={{
        className: 'relative z-40',
      }}
      footer={
        mountContent ? (
          <FilmViewFooter
            film={film}
            voroforceCell={voroforceCell}
            handleClose={handleClose}
            direction={direction}
          />
        ) : null
      }
      handleProps={{
        className:
          'max-md:bg-background max-md:-translate-y-[150%] max-md:h-1.5 lg:bg-transparent lg:backdrop-blur-lg',
      }}
      additional={mountContent ? <AddCustomLinkModal /> : null}
    >
      <Suspense>{mountContent && <FilmView film={film} />}</Suspense>
    </Modal>
  )
}
