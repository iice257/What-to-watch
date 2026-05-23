export enum VOROFORCE_MODE {
  preview = 0,
  select = 1,
  intro = 2,
}

export const DEFAULT_VOROFORCE_MODE: VOROFORCE_MODE = VOROFORCE_MODE.preview

export enum VOROFORCE_PRESET {
  mobile = 'mobile',
  minimal = 'minimal',
  contours = 'contours',
  depth = 'depth',
  chaos = 'chaos',
}

export const DEFAULT_VOROFORCE_PRESET: VOROFORCE_PRESET =
  VOROFORCE_PRESET.minimal

export enum DEVICE_CLASS {
  mobile = 0,
  low = 1,
  mid = 2,
  high = 3,
}

export type PresetItem = {
  id: VOROFORCE_PRESET
  name: string
  videoSrc?: string
  imgSrc?: string
  recommendedDeviceClass?: DEVICE_CLASS
  wip?: boolean
  disabled?: boolean
}

export type PresetItems = Array<PresetItem | Array<PresetItem>>

export const PRESET_ITEMS: PresetItems = [
  {
    id: VOROFORCE_PRESET.minimal,
    name: 'Minimal',
    // videoSrc: '/tmp.webm',
    recommendedDeviceClass: DEVICE_CLASS.low,
  },
]

export enum CELL_LIMIT {
  xxs = 5000,
  xs = 10000,
  sm = 25000,
  md = 50000,
  lg = 100000,
}

export const CELL_LIMIT_ITEMS = [
  {
    value: CELL_LIMIT.xs,
    label: '10,000',
    recommendedDeviceClass: DEVICE_CLASS.low,
  },
]

export const DEVICE_CLASS_ITEMS = [
  {
    id: DEVICE_CLASS.mobile,
    name: '📱Mobile',
  },
  {
    id: DEVICE_CLASS.low,
    name: '🥔 Potato',
  },
  {
    id: DEVICE_CLASS.mid,
    name: '😐 Mid-range',
  },
  {
    id: DEVICE_CLASS.high,
    name: '💪 High-end',
  },
]

export const OBSCURE_VISUAL_DEFECTS = true
