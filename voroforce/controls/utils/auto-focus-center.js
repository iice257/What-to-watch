import { isTouchDevice } from '../../utils'

export const autoFocusCenterEnabled = (config) =>
  config.autoFocusCenter?.enabled &&
  (config.autoFocusCenter.enabled !== 'touch' || isTouchDevice)

export const autoFocusCenterBaseRandomOffsetPercentage = (config) =>
  config.autoFocusCenter?.random
    ? (config.autoFocusCenter?.baseRandomOffsetPercentage ?? 0.1)
    : 0
