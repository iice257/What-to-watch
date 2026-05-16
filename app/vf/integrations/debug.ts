import { store } from '../../store'

export const handleDebug = () => {
  const { voroforce, config } = store.getState()

  if (!voroforce) return

  const dimensions = voroforce.dimensions.get()

  console.log('dimensions', dimensions)
  console.log(
    'resolution scale',
    emulateResolutionScale([
      dimensions.width * dimensions.pixelRatio,
      dimensions.height * dimensions.pixelRatio,
    ]),
  )
  console.log('cell scale', emulateCellScale(config.cells))
}

function emulateResolutionScale(
  iResolution: [number, number] | [number, number, number],
) {
  const resolutionX = iResolution[0]
  const resolutionY = iResolution[1]

  // Calculate length of resolution vector (equivalent to GLSL length(iResolution.xy))
  let resolutionScale =
    Math.sqrt(resolutionX * resolutionX + resolutionY * resolutionY) / 1500.0

  // Apply cheapSqrt equivalent (GLSL: 1./inversesqrt(a) = sqrt(a))
  resolutionScale = Math.sqrt(resolutionScale)

  return resolutionScale
}

function emulateCellScale(cells: number) {
  // Calculate length of resolution vector (equivalent to GLSL length(iResolution.xy))
  let cellScale = 50000 / cells

  // Apply cheapSqrt equivalent (GLSL: 1./inversesqrt(a) = sqrt(a))
  cellScale = Math.sqrt(cellScale)

  return cellScale
}
