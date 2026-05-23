export const selectForceSimulationStepConfig = {
  parameters: {
    alpha: 0.2,
    velocityDecay: 0.72,
    velocityDecayBase: 0.72,
    velocityDecayTransitionEnterMode: 0.72,
  },
  forces: {
    manageWeights: true,
    primaryCellWeightPushFactorEnabled: false,
    smoothPrimaryCell: false,
    requestMediaVersions: {
      enabled: true,
      handleMediaSpeedLimits: false,
      primaryTargetVersion: 2,
      v3ColLevelAdjacencyThreshold: 1,
      v3RowLevelAdjacencyThreshold: 1,
      v2ColLevelAdjacencyThreshold: 9999,
      v2RowLevelAdjacencyThreshold: 9999,
      v1ColLevelAdjacencyThreshold: 9999,
      v1RowLevelAdjacencyThreshold: 9999,
    },
    breathing: {
      enabled: false,
    },
    push: {
      strength: 0.06,
      selector: 'focused',
      yFactor: 1.5,
    },
    lattice: {
      strength: 1,
      yFactor: 1.5,
      xFactor: 1,
      maxLevelsFromPrimary: 42,
    },
    origin: {
      strength: 0.12,
      latticeScale: 3,
    },
  },
}
