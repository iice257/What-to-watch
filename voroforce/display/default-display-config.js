import { defaultSceneConfig } from './scene'

export const defaultDisplayConfig = {
  scene: defaultSceneConfig,
  renderer: {
    depth: false,
    preserveDrawingBuffer: false,
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    backgroundColor: '#ffffff00',
    // clearColor: [0, 1, 0, 1],
    // pixelRatio: 1, // override device pixel ratio
    scissor: {
      enabled: false,
      offset: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
  },
}
