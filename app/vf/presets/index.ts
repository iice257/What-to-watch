import { default as chaos } from './chaos'
import { default as contours } from './contours'
import { default as depth } from './depth'
import { default as minimal } from './minimal'
import { default as mobile } from './mobile'

import { VOROFORCE_PRESET } from '../consts'

const presets = {
  [VOROFORCE_PRESET.mobile]: mobile,
  [VOROFORCE_PRESET.minimal]: minimal,
  [VOROFORCE_PRESET.depth]: depth,
  [VOROFORCE_PRESET.contours]: contours,
  [VOROFORCE_PRESET.chaos]: chaos,
}

export default presets
