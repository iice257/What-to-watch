import { describe, expect, it } from 'vitest'
import { CELL_LIMIT, DEVICE_CLASS } from '../consts'
import {
  clampRuntimeGridCellCount,
  getRuntimeGridCellLimit,
} from './grid-cells'

describe('runtime grid cell caps', () => {
  it('uses 10k as the desktop cap', () => {
    expect(getRuntimeGridCellLimit({ deviceClass: DEVICE_CLASS.low })).toBe(
      10000,
    )
    expect(
      clampRuntimeGridCellCount({
        cells: CELL_LIMIT.xs,
        defaultCellLimit: 10000,
        deviceClass: DEVICE_CLASS.low,
      }),
    ).toBe(10000)
  })

  it('keeps mobile capped at 5k even when desktop cells are requested', () => {
    expect(getRuntimeGridCellLimit({ deviceClass: DEVICE_CLASS.mobile })).toBe(
      5000,
    )
    expect(
      clampRuntimeGridCellCount({
        cells: CELL_LIMIT.xs,
        defaultCellLimit: 10000,
        deviceClass: DEVICE_CLASS.mobile,
      }),
    ).toBe(5000)
  })

  it('allows smaller explicit counts below the runtime cap', () => {
    expect(
      clampRuntimeGridCellCount({
        cells: 2500,
        defaultCellLimit: 10000,
        deviceClass: DEVICE_CLASS.low,
      }),
    ).toBe(2500)
  })

  it('keeps mobile runtime capped at 5k even when saved device class is not mobile', () => {
    expect(
      getRuntimeGridCellLimit({
        deviceClass: DEVICE_CLASS.low,
        isMobileRuntime: true,
      }),
    ).toBe(5000)
    expect(
      clampRuntimeGridCellCount({
        cells: CELL_LIMIT.xs,
        defaultCellLimit: 10000,
        deviceClass: DEVICE_CLASS.low,
        isMobileRuntime: true,
      }),
    ).toBe(5000)
  })
})
