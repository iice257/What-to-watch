import { isObject } from '../../utils'

export function setupDevTools(devTools, app, config) {
  const d = devTools.paneFolders[1]
  const dMain = d.addFolder({
    title: 'Main',
    expanded: true,
  })

  Object.keys(config.scene.main.uniforms).forEach((key) => {
    if (isObject(config.scene.main.uniforms[key].value)) return
    dMain
      .addBinding(config.scene.main.uniforms[key], 'value')
      .on('change', () => {
        app.scene.refreshCustom()
      }).label = key
  })

  if (config.scene.post?.uniforms) {
    const dPost = d.addFolder({
      title: 'Post',
      expanded: true,
    })
    Object.keys(config.scene.post.uniforms).forEach((key) => {
      if (isObject(config.scene.post.uniforms[key].value)) return
      dPost
        .addBinding(config.scene.post.uniforms[key], 'value')
        .on('change', () => {
          app.scene.refreshCustom()
        }).label = key
    })
  }
}
