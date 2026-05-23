import { mergeConfigs } from '√'
import { VOROFORCE_MODE } from '../../consts'

export const baseLatticeConfig = {
  enabled: true,
  aspect: 2 / 3,
  autoTargetMediaVersion2SubgridCount: 999999,
  autoTargetMediaVersion1SubgridCount: 999999,
  modes: {
    [VOROFORCE_MODE.intro]: {},
  },
}

export const introModeLatticeConfig = mergeConfigs(baseLatticeConfig, {
  autoTargetMediaVersion2SubgridCount: 10,
  autoTargetMediaVersion1SubgridCount: 100,
  targetCellSizeViewportPercentage: 0.075,
})
