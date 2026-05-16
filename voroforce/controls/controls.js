import { distance } from '../utils'
import BaseControls from './base-controls'
import {
  PointerFrozenChangeEvent,
  PointerPinnedChangeEvent,
} from './controls-events'
import { getCell, getDirectionalNeighborCellIndex } from './utils/cell'
import { DebugMarker } from './utils/debug-marker'
import { DetachGestureHandler } from './utils/detach-gesture-handler'

const { pow, sqrt } = Math

const getAverageSpeedTotal = (array) =>
  array.reduce((a, b) => a + b.total, 0) / array.length

const MAX_SPEED_HISTORY = 10

export default class Controls extends BaseControls {
  reset() {
    super.reset()
    this.speedHistory = []
    this.rawSpeedHistory = []
    this.position = null
    this.lastPosition = null
    this.lastRawPosition = null
    this.speed = { x: 0, y: 0, total: 0 }
    this.rawSpeed = { x: 0, y: 0, total: 0 }
    this.avgRawSpeedTotal = 0
    this.avgSpeedTotal = 0
  }

  handleConfig() {
    super.handleConfig()
    this.options = {
      debug: this.config.debug || false,
      maxSpeed: this.config.maxSpeed || 10,
      maxSpeedPinned: this.config.maxSpeedPinned || this.config.maxSpeed || 10,
      ease: this.config.ease || 0.15,
      easePinned: this.config.easePinned || this.config.ease || 0.15,
      interactionMaxSpeed: this.config.interactionMaxSpeed || 5,
      zoom:
        typeof this.config.zoom?.enabled === 'boolean'
          ? this.config.zoom.enabled
          : true,
      zoomMin: this.config.zoom?.min || 1,
      zoomMax: this.config.zoom?.max || 1.5,
      freezeOnJolt: {
        enabled: this.config.freezeOnJolt?.enabled || false,
        factor: this.config.freezeOnJolt?.factor || 7,
        minSpeedValue: this.config.freezeOnJolt?.minSpeedValue || 2,
      },
      freezeOnShake: {
        enabled: this.config.freezeOnShake?.enabled || false,
        minSpeed: this.config.freezeOnShake?.minSpeed || 2, // Minimum velocity to count as a shake
        dirChangeTimeout: this.config.freezeOnShake?.dirChangeTimeout || 250, // Reset after this many ms of no dir change
        minShakes: this.config.freezeOnShake?.minShakes || 3, // Minimum direction changes to trigger a shake
        cooldown: this.config.freezeOnShake?.cooldown || 2000, // Minimum time between shake events
      },
    }

    if (
      (this.options.freezeOnJolt.enabled ||
        this.options.freezeOnShake.enabled) &&
      !this.detachGestureHandler
    ) {
      this.detachGestureHandler = new DetachGestureHandler(this)
    }

    if (this.options.debug) {
      if (!this.debugMarker) this.debugMarker = new DebugMarker(this.container)
    } else if (this.debugMarker) {
      this.debugMarker.destroy()
      this.debugMarker = null
    }
  }

  handleAutoFocusCenter() {
    super.handleAutoFocusCenter()
    this.freezePointer()
  }

  handleAutoFocusUpdate() {
    if (this.cells.focused) {
      this.pinPointer()
      this.update = this.handleFirstUpdate
      return
    }

    this.handleUpdate()
  }

  handleUpdate() {
    this.handlePositions()
    this.handleCursor()

    if (this.isDetached()) {
      if (
        this.rawPosition &&
        !this.rawPositionIdle &&
        this.avgSpeedTotal < this.options.interactionMaxSpeed
      ) {
        // only check pixels if raw position exists and is active and pointer speed is reasonable
        if (
          this.hasSelection() ||
          !this.isFrozen() ||
          distance(this.rawPosition, this.frozenPosition) < 50
        ) {
          // only check pixels if in select mode or no frozen position or the raw position is close to the frozen position
          this.getCellIndices(this.rawPosition, (index, indices) => {
            if (!this.rawPosition) return
            Object.assign(this.rawPosition, {
              index,
              indices,
            })
            if (this.cells.focusedIndex === index) {
              this.unfreezePointer()
            }
          })
        }
      }
    }

    if (!this.isFrozen()) {
      if (!this.position) return
      this.assignPointer({
        x: this.position.x,
        y: this.position.y,
        speedScale: this.avgSpeedTotal / this.options.maxSpeed,
      })
    }

    this.getCellIndices(this.pointer, (index, indices) => {
      this.assignPointer({
        indices,
      })
      this.focusCell(index)
    })
  }

  handlePositions() {
    this.handleRawPosition()
    this.handleMainPosition()
  }

  handleMainPosition() {
    let targetPosition = this.rawPosition

    if (this.pinnedPosition) {
      targetPosition = this.pinnedPosition
      if (this.outOfBounds(targetPosition)) {
        this.freezePointer()
        return
      }
    }

    if (!targetPosition) return

    // Process the position with capping if needed
    this.position = this.calcMainPosition(targetPosition)
    this.clampToBounds(this.position)

    this.speedHistory.push({
      ...this.speed,
    })
    // Keep array at max size
    if (this.speedHistory.length > MAX_SPEED_HISTORY) {
      this.speedHistory.shift()
      this.avgSpeedTotal = getAverageSpeedTotal(this.speedHistory)
    }

    // Save last processed values for next calculation
    this.lastPosition = {
      x: this.position.x,
      y: this.position.y,
    }

    this.debugMarker?.updatePosition(this.position)
  }

  calcMainPosition(targetPosition) {
    // If this is the first position, just return target position
    if (!this.lastPosition) return targetPosition

    if (this.detectDetachGesture()) {
      this.freezePointer()
      return {
        x: this.lastPosition.x,
        y: this.lastPosition.y,
      }
    }

    if (this.isFrozen()) {
      this.speed.x = 0
      this.speed.y = 0
      this.speed.total = 0
      return targetPosition
    }

    // Calculate position delta
    const deltaX = targetPosition.x - this.lastPosition.x
    const deltaY = targetPosition.y - this.lastPosition.y

    const distance = sqrt(pow(deltaX, 2) + pow(deltaY, 2))

    // Small threshold to stop when extremely close
    if (distance < 0.1) {
      this.speed.x = 0
      this.speed.y = 0
      this.speed.total = 0
      return targetPosition
    }

    const ease = this.pinnedPosition
      ? this.options.easePinned
      : this.options.ease
    const maxSpeed = this.pinnedPosition
      ? this.options.maxSpeedPinned
      : this.options.maxSpeed

    // Calculate the movement for this frame
    let cappedDeltaX = deltaX * ease
    let cappedDeltaY = deltaY * ease

    let speed = sqrt(cappedDeltaX * cappedDeltaX + cappedDeltaY * cappedDeltaY)

    // Apply speed limit while maintaining direction
    if (speed > maxSpeed) {
      const ratio = maxSpeed / speed
      cappedDeltaX *= ratio
      cappedDeltaY *= ratio
      speed = maxSpeed
    }

    this.speed.x = cappedDeltaX
    this.speed.y = cappedDeltaY
    this.speed.total = speed

    return {
      x: this.lastPosition.x + cappedDeltaX,
      y: this.lastPosition.y + cappedDeltaY,
    }
  }

  handleRawPosition() {
    if (!this.rawPosition) return

    this.clampToBounds(this.rawPosition)

    this.assignPointer({
      rawX: this.rawPosition.x,
      rawY: this.rawPosition.y,
    })

    if (this.lastRawPosition) {
      // raw speed
      this.rawSpeed.x = this.rawPosition.x - this.lastRawPosition.x
      this.rawSpeed.y = this.rawPosition.y - this.lastRawPosition.y
      this.rawSpeed.total = sqrt(
        pow(this.rawSpeed.x, 2) + pow(this.rawSpeed.y, 2),
      )

      this.rawSpeedHistory.push({
        ...this.rawSpeed,
      })
      // Keep array at max size
      if (this.rawSpeedHistory.length > MAX_SPEED_HISTORY) {
        this.rawSpeedHistory.shift()
        this.avgRawSpeedTotal = getAverageSpeedTotal(this.rawSpeedHistory)
      }
    }

    this.lastRawPosition = { ...this.rawPosition }
  }

  handleCursor() {
    let cursor
    if (this.isTouching) {
      cursor = 'default'
    } else if (this.pointer.dragging) {
      cursor = 'grabbing'
    } else if (this.isPinned() && this.hasSelection()) {
      if (this.rawIsPinned()) {
        cursor = 'zoom-out'
      } else {
        cursor = 'pointer'
      }
    } else {
      if (!this.isDetached()) {
        if (this.hasSelection()) {
          if (this.focusedIsSelected()) {
            cursor = 'zoom-out'
          } else {
            cursor = 'pointer'
          }
        } else {
          if (this.avgSpeedTotal < this.options.interactionMaxSpeed) {
            cursor = 'pointer'
          } else {
            cursor = 'default'
          }
        }
      } else {
        if (this.hasSelection()) {
          cursor = 'pointer'
          if (this.rawIsSelected()) {
            cursor = 'zoom-out'
          } else {
            cursor = 'pointer'
          }
        } else {
          cursor = 'default'
        }
      }
    }

    if (cursor) this.setCursor(cursor)
  }

  onPointerDown(e) {
    if (this.isTouching) return
    this.pointer.down = true
    if (this.rawIsFocused()) {
      this.pointer.canDrag = true
      this.pointer.downStartX = e.clientX || e.x
      this.pointer.downStartY = e.clientY || e.y
    }
    this.logger?.debug('onPointerDown')
  }

  onPointerMove(e) {
    if (this.isPinching) return

    super.onPointerMove(e)

    if (this.isTouching) {
      this.attach()
    } else if (this.pointer.down && !this.pointer.canDrag) {
      this.pinPointer(this.rawPosition)
    } else if (this.isPinned()) {
      if (this.hasSelection()) {
        if (!this.rawIsFocused()) {
          this.freezePointer()
        }
      } else {
        if (this.pinnedIsFocused()) this.freezePointer()
      }
    }
  }

  handlePointerOut() {
    this.pointer.dragging = false
    this.pointer.down = false
    this.pointer.canDrag = false
    if (!this.isDetached()) {
      if (this.hasSelection()) {
        this.pinPointer()
      } else {
        this.freezePointer()
      }
    }
  }

  onPointerClick(e) {
    if (this.isPinching) return
    if (this.pointer.dragging) {
      this.pointer.dragging = false
      return
    }
    this.logger?.debug('onPointerClick')
    this.updateRawPositionFromEvent(e)

    this.getCellIndices(this.rawPosition, (index, indices) => {
      if (!this.rawPosition) return
      Object.assign(this.rawPosition, {
        index,
        indices,
      })
      if (
        !this.isTouching &&
        (this.frozenPosition || (this.pinnedPosition && !this.rawIsPinned()))
      ) {
        this.navigateToCell(this.rawPosition.index)
      } else {
        this.requestSelection(this.rawPosition)
      }
    })
  }

  freezePointer(frozenPosition) {
    if (this.pinnedPosition) this.unpinPointer()
    this.pointer.speedScale = 0
    this.frozenPosition =
      frozenPosition ?? this.frozenPosition ?? this.savePointer()

    this.dispatchEvent(
      new PointerFrozenChangeEvent({
        frozen: true,
        pointer: this.pointer,
        frozenPosition: this.frozenPosition,
      }),
    )
    this.logger?.debug('freeze pointer')
    this.debugMarker?.updateColor('blue')
  }

  unfreezePointer() {
    if (!this.frozenPosition) return
    if (!this.lastPosition) this.lastPosition = {}
    Object.assign(this.lastPosition, this.frozenPosition)
    this.frozenPosition = null
    this.dispatchEvent(
      new PointerFrozenChangeEvent({
        frozen: false,
        pointer: this.pointer,
      }),
    )
    this.logger?.debug('unfreeze pointer')
    this.debugMarker?.updateColor('red')
  }

  pinPointer(pinnedPosition) {
    this.pinnedPosition =
      pinnedPosition ?? this.pinnedPosition ?? this.cells.focused
    if (!this.pinnedPosition) return
    if (this.frozenPosition) this.unfreezePointer()
    this.dispatchEvent(
      new PointerPinnedChangeEvent({
        pinned: true,
        pointer: this.pointer,
        pinnedPosition: this.pinnedPosition,
      }),
    )
    this.logger?.debug('pin pointer')
    this.debugMarker?.updateColor('green')
  }

  unpinPointer() {
    if (!this.pinnedPosition) return
    this.pinnedPosition = null

    this.dispatchEvent(
      new PointerPinnedChangeEvent({
        pinned: false,
        pointer: this.pointer,
      }),
    )
    this.logger?.debug('unpin pointer')
    this.debugMarker?.updateColor('red')
  }

  requestSelection(pointer) {
    this.logger?.debug('handleSelectRequest')
    let selectCellIndex
    const hasPreviousSelection = this.hasSelection()
    if (!hasPreviousSelection) {
      if (
        this.avgSpeedTotal < this.options.interactionMaxSpeed &&
        pointer.index === this.cells.focusedIndex
      ) {
        selectCellIndex = this.cells.focusedIndex
      }
    } else {
      if (pointer.index !== this.cells.selectedIndex) {
        selectCellIndex = pointer.index
      } else {
        this.deselect()
      }
    }

    if (selectCellIndex) {
      this.selectCell(selectCellIndex)
      if (hasPreviousSelection) {
        this.pinPointer(this.cells.selected)
      } else {
        this.resetZoom()
      }
      return selectCellIndex
    }
  }

  deselect() {
    super.deselect()
  }

  deselectAndPin() {
    this.deselect()
    this.pinPointer()
  }

  navigateToCell(cellOrCellIndex) {
    const cell = getCell(cellOrCellIndex, this.cells)
    if (!cell) return

    this.pinPointer(cell)
    if (this.hasSelection()) {
      this.selectCell(cell)
    }
  }

  navigateToCellById(id) {
    return this.navigateToCell(this.cells.find((cell) => cell.id === id))
  }

  onKeyDown(e) {
    if (!this.hasFocus()) return

    switch (e.code) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (!this.globalConfig.lattice?.enabled) return
        const directionMap = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        }
        const direction = directionMap[e.key]
        e.preventDefault()
        this.navigateToCell(
          getDirectionalNeighborCellIndex(
            this.cells.focused,
            direction,
            this.globalConfig.lattice,
          ),
        )
        break
      }
      case 'Space':
      case 'Enter': {
        e.preventDefault()
        this.requestSelection(this.pointer)
        break
      }
      default:
        return
    }
  }

  onTouchStart(e) {
    this.logger?.debug('onTouchStart')
    this.isTouching = true

    if (e.touches.length === 1) {
      // Single touch - let pointer events handle it
      return
    }

    // Multi-touch gestures
    if (e.touches.length === 2) {
      this.handlePinchGesture(e.touches)
    }

    e.preventDefault() // Prevent pointer events for multi-touch
  }

  onTouchMove(e) {
    if (e.touches.length === 1) {
      // Single touch - let pointer events handle it
      return
    }

    // Multi-touch gestures
    if (e.touches.length === 2) {
      this.handlePinchGesture(e.touches)
    }

    e.preventDefault() // Prevent pointer events for multi-touch
  }

  onTouchEnd(e) {
    super.onTouchEnd(e)
    this.isPinching = false
    this.lastPinchDistance = undefined
  }

  handlePinchGesture(touches) {
    this.isPinching = true
    this.logger?.debug('onPinch')

    if (!this.options.zoom) return

    const touch1 = touches[0]
    const touch2 = touches[1]

    const distance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY,
    )

    if (this.lastPinchDistance) {
      const pinchRatio = distance / this.lastPinchDistance
      const deltaScale = Math.abs(pinchRatio - 1) * 2

      this.zoom =
        pinchRatio > 1
          ? Math.min(this.options.zoomMax, this.zoom + deltaScale)
          : Math.max(this.options.zoomMin, this.zoom - deltaScale)

      this.handleZoom(this.zoom)
    }

    this.lastPinchDistance = distance
  }

  zoom = 1
  onWheel(e) {
    // e.preventDefault()
    this.logger?.debug('onWheel', { deltaY: e.deltaY })

    if (!this.options.zoom) return

    const deltaScale = Math.abs(e.deltaY) * 0.001
    this.zoom =
      e.deltaY > 0
        ? Math.max(this.options.zoomMin, this.zoom - deltaScale)
        : Math.min(this.options.zoomMax, this.zoom + deltaScale)
    this.handleZoom(this.zoom)
  }

  handleZoom(zoom) {
    this.logger?.debug('zoom', zoom)
    this.pointer.zoom = zoom

    if (!this.hasSelection()) {
      if (zoom >= this.options.zoomMax) {
        this.requestSelection(this.pointer)
      }
    } else {
      if (zoom <= this.options.zoomMin) {
        this.deselect()
      }
    }
  }

  resetZoom() {
    this.pointer.zoom = this.zoom = 1
  }

  initEventListeners() {
    super.initEventListeners()
    this.initWheelEventListeners()
    this.initKeyboardEventListeners()
    // this.initOrientationEventListeners()
  }

  removeEventListeners() {
    super.removeEventListeners()
    this.removeWheelEventListeners()
    this.removeKeyboardEventListeners()
    // this.removeOrientationEventListeners()
  }

  initWheelEventListeners() {
    if (this.boundOnWheel) return
    this.boundOnWheel = this.onWheel.bind(this)
    window.addEventListener('wheel', this.boundOnWheel)
  }

  removeWheelEventListeners() {
    if (!this.boundOnWheel) return
    window.removeEventListener('wheel', this.boundOnWheel)
    this.boundOnWheel = undefined
  }

  initKeyboardEventListeners() {
    if (this.boundOnKeyDown) return
    this.boundOnKeyDown = this.onKeyDown.bind(this)
    window.addEventListener('keydown', this.boundOnKeyDown)
  }

  removeKeyboardEventListeners() {
    if (!this.boundOnKeyDown) return
    window.removeEventListener('keydown', this.boundOnKeyDown)
    this.boundOnKeyDown = undefined
  }

  onDeviceOrientation(e) {
    // TODO
  }

  initOrientationEventListeners() {
    if (this.boundOnDeviceOrientation) return
    if (typeof DeviceOrientationEvent === 'undefined') return

    this.boundOnDeviceOrientation = this.onDeviceOrientation.bind(this)

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response === 'granted') {
            window.addEventListener(
              'deviceorientation',
              this.boundOnDeviceOrientation,
            )
          }
        })
        .catch(() => {
          // Permission denied or error
        })
    } else {
      // For other devices
      window.addEventListener(
        'deviceorientation',
        this.boundOnDeviceOrientation,
      )
    }
  }

  removeOrientationEventListeners() {
    if (!this.boundOnDeviceOrientation) return
    window.removeEventListener(
      'deviceorientation',
      this.boundOnDeviceOrientation,
    )
    this.boundOnDeviceOrientation = undefined
  }

  startResize(dimensions) {
    super.startResize(dimensions)
  }

  endResize(dimensions) {
    super.endResize(dimensions)
    this.freezePointer(this.savePointer())
  }

  attach() {
    this.unpinPointer()
    this.unfreezePointer()
  }

  isDetached() {
    return this.isFrozen() || this.isPinned()
  }

  isFrozen() {
    return this.frozenPosition
  }

  isPinned() {
    return this.pinnedPosition
  }

  pinnedIsFocused() {
    return (
      this.isPinned() && this.pinnedPosition.index === this.cells.focusedIndex
    )
  }

  rawIsFocused() {
    return this.rawPosition?.index === this.cells.focusedIndex
  }

  rawIsSelected() {
    return (
      this.hasSelection() &&
      this.rawPosition?.index === this.cells.selectedIndex
    )
  }

  rawIsPinned() {
    return (
      this.isPinned() && this.rawPosition?.index === this.pinnedPosition.index
    )
  }

  setCursor(cursor) {
    this.container.style.cursor = cursor
  }

  detectDetachGesture() {
    if (
      this.detachGestureHandler &&
      !this.isTouching &&
      !this.pointer.down &&
      !this.isDetached()
    ) {
      return this.detachGestureHandler.detectDetachGesture()
    }
  }
}
