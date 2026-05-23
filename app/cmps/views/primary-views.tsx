import { useShallowState } from '../../store'
import { About } from './about'
import { Favorites } from './favorites'
import { FilmPreview, FilmViewDrawer } from './film'
import { HotkeysView } from './hotkeys'
import { LowFpsAlert } from './low-fps-alert'
import { Settings } from './settings'

const PrimaryViews = () => {
  const uiVisible = useShallowState((state) => state.uiVisible)

  return (
    <>
      <FilmPreview />
      {uiVisible && (
        <>
          <Settings />
          <About />
          <Favorites />
          <FilmViewDrawer />
          <LowFpsAlert />
          <HotkeysView />
        </>
      )}
    </>
  )
}

export default PrimaryViews
