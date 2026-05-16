import { About } from './about'
import { Favorites } from './favorites'
import { FilmPreview, FilmViewDrawer } from './film'
import { HotkeysView } from './hotkeys'
import { LowFpsAlert } from './low-fps-alert'
import { Settings } from './settings'

const PrimaryViews = () => (
  <>
    <Settings />
    <About />
    <Favorites />
    <FilmPreview />
    <FilmViewDrawer />
    <LowFpsAlert />
    <HotkeysView />
  </>
)

export default PrimaryViews
