export const defaultControlsConfig = {
  debug: false,
  autoFocusCenter: {
    enabled: true, // true, false or 'touch'
    random: false,
    baseRandomOffsetPercentage: 0.1,
  },
  maxSpeed: 10,
  // maxSpeedPinned: 5,
  ease: 0.15, // smoothing factor
  // easePinned: 0.05,
  zoom: {
    enabled: true,
    min: 1,
    max: 1.5,
  },
  freezeOnShake: {
    enabled: true,
  },
  freezeOnJolt: {
    enabled: true,
  },
}
