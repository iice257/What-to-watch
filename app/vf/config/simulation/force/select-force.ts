export const selectForceSimulationStepConfig = {
  parameters: {
    alpha: 0.28,
    velocityDecay: 0.55,
    velocityDecayBase: 0.55,
    velocityDecayTransitionEnterMode: 0.6,
  },
  forces: {
    manageWeights: true,
    primaryCellWeightPushFactorEnabled: false,
    smoothPrimaryCell: false,
    requestMediaVersions: {
      enabled: true,
      handleMediaSpeedLimits: false,
      v3ColLevelAdjacencyThreshold: 1,
      v3RowLevelAdjacencyThreshold: 1,
      v2ColLevelAdjacencyThreshold: 18,
      v2RowLevelAdjacencyThreshold: 18,
    },
    breathing: {
      enabled: false,
    },
    push: {
      strength: 0.09,
      selector: 'focused',
      yFactor: 1.5,
    },
    lattice: {
      strength: 1,
      yFactor: 1.5,
      xFactor: 1,
      maxLevelsFromPrimary: 32,
    },
    origin: {
      strength: 0.16,
      latticeScale: 3,
    },
  },
}
