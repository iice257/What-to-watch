export const previewForceSimulationStepConfig = {
  parameters: {
    alpha: 0.18,
    velocityDecay: 0.68,
    velocityDecayBase: 0.68,
    velocityDecayTransitionEnterMode: 0.8,
  },
  forces: {
    manageWeights: true,
    primaryCellWeightPushFactorEnabled: true,
    smoothPrimaryCell: true,
    requestMediaVersions: {
      enabled: true,
      handleMediaSpeedLimits: false,
      primaryTargetVersion: 2,
      v2ColLevelAdjacencyThreshold: 9999,
      v2RowLevelAdjacencyThreshold: 9999,
      v1ColLevelAdjacencyThreshold: 9999,
      v1RowLevelAdjacencyThreshold: 9999,
    },
    breathing: {
      enabled: false,
    },
    push: {
      strength: 0.1,
      yFactor: 2.5,
      alignmentMaxLevelsX: 40,
      centerXStretchMod: 0.4,
      speedFactor: 1,
    },
    lattice: {
      strength: 0.8,
      yFactor: 3.75,
      xFactor: 1,
      maxLevelsFromPrimary: 30,
    },
    origin: {
      strength: 0.8,
      yFactor: 1.5,
    },
  },
}
