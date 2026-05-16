import { Navbar, ThemeProvider } from './cmps/layout'
import PrimaryViews from './cmps/views'
import { Intro } from './cmps/views/intro'

const App = () => (
  <ThemeProvider>
    <Navbar />
    <PrimaryViews />
    <Intro />
  </ThemeProvider>
)

export default App
