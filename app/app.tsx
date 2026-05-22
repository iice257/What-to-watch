import { EdgeVignette } from './cmps/common/edge-vignette'
import { Navbar, ThemeProvider } from './cmps/layout'
import PrimaryViews from './cmps/views'
import { Intro } from './cmps/views/intro'

const App = () => (
  <ThemeProvider>
    <EdgeVignette />
    <Navbar />
    <PrimaryViews />
    <Intro />
  </ThemeProvider>
)

export default App
