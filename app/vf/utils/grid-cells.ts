import { DEVICE_CLASS } from '../consts'

export const DESKTOP_RANDOM_GRID_CELLS = 10000
export const MOBILE_RANDOM_GRID_CELLS = 5000

export const getRuntimeGridCellLimit = ({
  deviceClass,
  isMobileRuntime,
}: {
  deviceClass?: DEVICE_CLASS
  isMobileRuntime?: boolean
} = {}) =>
  deviceClass === DEVICE_CLASS.mobile || isMobileRuntime
    ? MOBILE_RANDOM_GRID_CELLS
    : DESKTOP_RANDOM_GRID_CELLS

export const clampRuntimeGridCellCount = ({
  cells,
  defaultCellLimit,
  deviceClass,
  isMobileRuntime,
}: {
  cells: number
  defaultCellLimit: number
  deviceClass?: DEVICE_CLASS
  isMobileRuntime?: boolean
}) => {
  const runtimeGridCellLimit = getRuntimeGridCellLimit({
    deviceClass,
    isMobileRuntime,
  })

  return Math.min(cells, defaultCellLimit, runtimeGridCellLimit)
}
