export const introForceSimulationStepConfig = {
  parameters: {
    transition: true,
    alpha: 0.8,
    velocityDecay: 0.6,
    velocityDecayBase: 0.6,
    velocityDecayTransitionEnterMode: 0.6,
  },
  forces: [
    {
      type: 'origin',
      enabled: true,
      strength: 0.05,
    },
  ],
}
