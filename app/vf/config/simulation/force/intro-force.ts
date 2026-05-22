export const introForceSimulationStepConfig = {
  parameters: {
    transition: true,
    alpha: 0.8,
    velocityDecay: 0.72,
    velocityDecayBase: 0.72,
    velocityDecayTransitionEnterMode: 0.72,
  },
  forces: [
    {
      type: 'origin',
      enabled: true,
      strength: 0.05,
    },
  ],
}
