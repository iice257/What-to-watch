import type { THEME } from '../../consts'
import { store } from '../../store'
import { updateUniformsByTheme } from '../utils'

const handleThemeChange = (theme: THEME): void => {
  const {
    configUniforms: {
      main: mainUniforms,
      post: postUniforms,
      transitioning: transitioningUniforms,
    },
  } = store.getState()

  updateUniformsByTheme(mainUniforms, theme, transitioningUniforms)
  updateUniformsByTheme(postUniforms, theme, transitioningUniforms)
}

export const handleTheme = () => {
  const { theme: initialTheme } = store.getState()
  handleThemeChange(initialTheme)
  store.subscribe((state) => state.theme, handleThemeChange)
}
