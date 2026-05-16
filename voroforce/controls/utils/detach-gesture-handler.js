import { PointerShakeEvent } from '../controls-events'

const { max } = Math

export class DetachGestureHandler {
  constructor(controls) {
    this.controls = controls
  }

  detectDetachGesture() {
    return this.detectJolt() || this.detectShake()
  }

  detectJolt() {
    if (!this.controls.options.freezeOnJolt?.enabled) return

    const detectedJolt =
      this.controls.rawSpeed.total >
      max(
        this.controls.avgRawSpeedTotal,
        this.controls.options.freezeOnJolt.minSpeedValue,
      ) *
        this.controls.options.freezeOnJolt.factor
    if (detectedJolt) this.controls.logger?.debug('detected jolt')
    return detectedJolt
  }

  detectShake() {
    if (!this.controls.options.freezeOnShake?.enabled) return

    if (
      this.controls.pointerFrozen ||
      this.controls.rawSpeed.total <=
        this.controls.options.freezeOnShake.minSpeed
    ) {
      this.resetShake()
      return
    }

    const directionX =
      this.controls.rawSpeed.x > 0
        ? 'right'
        : this.controls.rawSpeed.x < 0
          ? 'left'
          : null
    const directionY =
      this.controls.rawSpeed.y > 0
        ? 'down'
        : this.controls.rawSpeed.y < 0
          ? 'up'
          : null

    if (
      this.lastShakeDirectionX &&
      directionX &&
      directionX !== this.lastShakeDirectionX
    ) {
      this.shakeDirectionXChangeCount++
      this.refreshShakeDirChangeTimeout()
    }
    if (
      this.lastShakeDirectionY &&
      directionY &&
      directionY !== this.lastShakeDirectionY
    ) {
      this.shakeDirectionYChangeCount++
      this.refreshShakeDirChangeTimeout()
    }

    this.lastShakeDirectionX = directionX
    this.lastShakeDirectionY = directionY

    // Check if we've reached the threshold for a shake
    if (
      (this.shakeDirectionXChangeCount >=
        this.controls.options.freezeOnShake.minShakes ||
        this.shakeDirectionYChangeCount >=
          this.controls.options.freezeOnShake.minShakes) &&
      !this.shakeCooldownActive
    ) {
      // Trigger shake event
      this.controls.dispatchEvent(
        new PointerShakeEvent({
          pointer: this.controls.pointer,
          speed: this.controls.rawSpeed.total,
          directionXChanges: this.shakeDirectionXChangeCount,
          directionYChanges: this.shakeDirectionYChangeCount,
        }),
      )

      // Reset
      this.resetShake()

      // Set cooldown
      this.shakeCooldownActive = true
      setTimeout(() => {
        this.shakeCooldownActive = false
      }, this.controls.options.freezeOnShake.cooldown)

      return true
    }
  }

  resetShake() {
    this.shakeDirectionXChangeCount = 0
    this.shakeDirectionYChangeCount = 0
    this.lastShakeDirectionX = null
    this.lastShakeDirectionX = null
  }

  clearShakeDirChangeTimeout() {
    if (this.shakeDirChangeTimeout) {
      clearTimeout(this.shakeDirChangeTimeout)
    }
  }

  refreshShakeDirChangeTimeout() {
    this.clearShakeDirChangeTimeout()
    this.shakeDirChangeTimeout = setTimeout(() => {
      this.resetShake()
    }, this.controls.options.freezeOnShake.dirChangeTimeout)
  }
}
