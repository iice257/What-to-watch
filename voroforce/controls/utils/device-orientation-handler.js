export class DeviceOrientationHandler {
  constructor() {
    // Current position
    this.currentX = window.innerWidth / 2
    this.currentY = window.innerHeight / 2

    // Target position (based on device orientation)
    this.targetX = this.currentX
    this.targetY = this.currentY

    // Calibration values (initial device orientation)
    this.calibrationBeta = null
    this.calibrationGamma = null
    this.isCalibrated = false
    this.shouldRecalibrate = false

    // Smoothing factor (0-1, higher = more responsive)
    this.smoothing = 0.08

    // Sensitivity multiplier
    this.sensitivity = 2

    this.isPermissionGranted = false
    this.isTouching = false

    this.init()
  }

  init() {
    void this.autoEnableDeviceOrientation()
  }

  async autoEnableDeviceOrientation() {
    try {
      // Check if DeviceOrientationEvent is supported
      if (!('DeviceOrientationEvent' in window)) {
        return
      }

      // For iOS 13+ devices, check if permission is required
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS requires explicit user interaction
        window.addEventListener('click', () => {
          void this.requestDeviceOrientationPermission()
        })
      } else {
        // For other devices, try to enable automatically
        this.enableDeviceOrientationTracking()
      }
    } catch (error) {
      console.error('Error checking orientation support:', error)
    }
  }

  handlePointerEvent(event) {
    if (this.isPermissionGranted) {
      // Flag for recalibration on next orientation event
      this.shouldRecalibrate = true
      this.isCalibrated = false
    }
  }

  async requestDeviceOrientationPermission() {
    try {
      // For iOS 13+ devices, request permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission()
        if (permission === 'granted') {
          this.enableDeviceOrientationTracking()
        }
      } else {
        // For other devices, assume permission is granted
        this.enableDeviceOrientationTracking()
      }
    } catch (error) {
      console.error('Error requesting device orientation permission:', error)
    }
  }

  enableDeviceOrientationTracking() {
    this.isPermissionGranted = true

    window.addEventListener('deviceorientation', (event) => {
      this.handleDeviceOrientationChange(event)
    })
  }

  handleDeviceOrientationChange(event) {
    const { beta, gamma } = event
    if (beta === null || gamma === null) return

    // Calibrate on first valid reading
    if (!this.isCalibrated) {
      this.calibrationBeta = beta
      this.calibrationGamma = gamma
      this.isCalibrated = true
      return
    }

    if (this.isCalibrated) {
      // Calculate relative change from calibration point
      const relativeBeta = beta - this.calibrationBeta
      const relativeGamma = gamma - this.calibrationGamma

      // Normalize to a reasonable range (±30 degrees gives good control)
      const maxTilt = 30
      const normalizedBeta = Math.max(-1, Math.min(1, relativeBeta / maxTilt))
      const normalizedGamma = Math.max(-1, Math.min(1, relativeGamma / maxTilt))

      // Calculate target position relative to center
      this.targetX =
        window.innerWidth / 2 +
        ((normalizedGamma * window.innerWidth) / 3) * this.sensitivity
      this.targetY =
        window.innerHeight / 2 +
        ((normalizedBeta * window.innerHeight) / 3) * this.sensitivity

      // Clamp to screen boundaries with padding
      const padding = 30
      this.targetX = Math.max(
        padding,
        Math.min(window.innerWidth - padding, this.targetX),
      )
      this.targetY = Math.max(
        padding,
        Math.min(window.innerHeight - padding, this.targetY),
      )
    }
  }
}
