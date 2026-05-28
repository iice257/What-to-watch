import { useShallowState } from '../../store'
import { About } from './about'
import { Favorites } from './favorites'
import { FilmPreview, FilmViewDrawer } from './film'
import { HotkeysView } from './hotkeys'
import { PerformanceHud } from './performance-hud'
import { Settings } from './settings'

const PrimaryViews = () => {
  const uiVisible = useShallowState((state) => state.uiVisible)

  return (
    <>
      <FilmPreview />
      <FilmViewDrawer />
      <PerformanceHud />
      {uiVisible && (
        <>
          <Settings />
          <About />
          <Favorites />
          <HotkeysView />
        </>
      )}
    </>
  )
}

export default PrimaryViews
