import { DEVICE_CLASS } from '../consts'
import {
  type RenderProfileId,
  getRenderProfile,
  renderProfiles,
} from './render-profile'

export const MOBILE_RANDOM_GRID_CELLS = 5000

export const getRuntimeGridCellLimit = ({
  deviceClass,
  isMobileRuntime,
  renderProfileId,
}: {
  deviceClass?: DEVICE_CLASS
  isMobileRuntime?: boolean
  renderProfileId?: RenderProfileId
} = {}) =>
  deviceClass === DEVICE_CLASS.mobile || isMobileRuntime
    ? MOBILE_RANDOM_GRID_CELLS
    : renderProfiles[
        renderProfileId ?? getRenderProfile({ isMobileRuntime }).id
      ].desktopRandomGridCells

export const clampRuntimeGridCellCount = ({
  cells,
  defaultCellLimit,
  deviceClass,
  isMobileRuntime,
  renderProfileId,
}: {
  cells: number
  defaultCellLimit: number
  deviceClass?: DEVICE_CLASS
  isMobileRuntime?: boolean
  renderProfileId?: RenderProfileId
}) => {
  const runtimeGridCellLimit = getRuntimeGridCellLimit({
    deviceClass,
    isMobileRuntime,
    renderProfileId,
  })

  return Math.min(cells, defaultCellLimit, runtimeGridCellLimit)
}
