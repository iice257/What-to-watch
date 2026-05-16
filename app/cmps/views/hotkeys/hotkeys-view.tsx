import { useCallback, useEffect, useState } from 'react'
import { useMediaQuery } from '../../../hooks/use-media-query'
import { selectIsIntroMode, useShallowState } from '../../../store'
import { up } from '../../../utils/mq'
import { Hotkeys } from '../../common/hotkeys'
import { Modal } from '../../common/modal'

export const HotkeysView = () => {
  const isMdScreen = useMediaQuery(up('md'))
  const hasMouse = useMediaQuery(
    '@media only screen and (any-hover: hover) and (any-pointer: fine)',
  )

  const { isIntroMode, hasPreset } = useShallowState((state) => ({
    isIntroMode: selectIsIntroMode(state),
    hasPreset: !!state.preset,
  }))

  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (isIntroMode && hasMouse && isMdScreen && hasPreset) {
      // give voroforce some cpu time
      timeout = setTimeout(() => setIsOpen(true), 300)
    } else if (isOpen) {
      timeout = setTimeout(() => setIsOpen(false), 3000)
    }

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [hasMouse, isIntroMode, hasPreset, isMdScreen, isOpen])

  return (
    <Modal
      rootProps={{
        direction: 'right',
        open: isOpen,
        onClose: close,
        modal: false,
      }}
      contentProps={{
        className:
          '!bottom-0 !top-auto !h-fit !w-fit !left-auto z-100 !pointer-events-none',
      }}
      innerContentProps={{
        className: '!bg-transparent !border-none !pointer-events-none',
      }}
      overlay={false}
      handle={false}
    >
      <div className='p-4 md:p-6 lg:p-9'>
        <Hotkeys className='pointer-events-auto origin-bottom-right scale-75' />
      </div>
    </Modal>
  )
}
