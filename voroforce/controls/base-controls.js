import { createLogger, isTouchDevice } from '../utils'
import { CustomEventTarget } from '../utils/custom-event-target'
import { CellFocusedEvent, CellSelectedEvent } from './controls-events'
import {
  autoFocusCenterBaseRandomOffsetPercentage,
  autoFocusCenterEnabled,
} from './utils/auto-focus-center'
import { getCellIndex } from './utils/cell'

export default class BaseControls extends CustomEventTarget {
  rawPosition = undefined

  constructor(store, display) {
    super()
    this.initGlobals(store, display)
    this.initProperties()
    this.handleFirstConfig()
    this.reset()
  }

  reset() {
    this.rawPosition = undefined
    this.resetZoom()
  }

  initGlobals(store, display) {
    this.store = store
    this.store.set('controls', this)
    this.globalConfig = this.store.get('config')
    this.config = this.globalConfig.controls
    this.display = display
  }

  initProperties() {
    this.container = this.store.get('container')
    this.dimensions = this.store.get('dimensions')
    this.pointer = this.store.get('sharedPointer')
    this.cells = this.store.get('cells')

    this.updateBounds()

    this.update = this.handleFirstUpdate
  }

  handleFirstUpdate() {
    this.initEventListeners()
    this.update = this.handleUpdate
    this.update()
  }

  handleFirstConfig() {
    this.container.style.setProperty('touch-action', 'none')
    if (this.config.debug) this.logger = createLogger('controls')

    if (autoFocusCenterEnabled(this.config)) {
      this.handleAutoFocusCenter()
    }

    this.handleConfig()
  }

  handleAutoFocusCenter() {
    this.assignPointer(this.getAutoFocusCenter())
    this.update = this.handleAutoFocusUpdate
  }

  handleConfig() {}

  updateConfig(config) {
    this.config = config
    this.globalConfig.controls = config
    this.handleConfig()
  }

  handleUpdate() {
    if (this.rawPosition) {
      this.assignPointer({
        x: this.rawPosition.x,
        y: this.rawPosition.y,
        speedScale: 0.2, // tmp solution for omni force (base controls only)
      })
    }

    this.getCellIndices(this.pointer, (primaryIndex, indices) => {
      this.assignPointer({
        indices,
      })
      this.focusCell(primaryIndex)
    })
  }

  getCellIndices(position, cb) {
    if (this.isResizing) return
    if (Number.isNaN(position.x) || Number.isNaN(position.y)) return
    this.display.getPositionCellIndices(position).then((indices) => {
      if (this.isResizing) return
      const primaryIndex = indices?.[0]
      if (primaryIndex === undefined) {
        console.warn('No cell found at position', {
          x: position.x,
          y: position.y,
        })
        this.handlePointerOut()
        return false
      }
      cb(primaryIndex, indices)
    })
  }

  getAutoFocusCenter() {
    const { width, height } = this.dimensions.get()
    const baseRandomOffsetPercentage =
      autoFocusCenterBaseRandomOffsetPercentage(this.config)
    return {
      x: Math.floor(
        width / 2 +
          (baseRandomOffsetPercentage
            ? (0.5 - Math.random()) * baseRandomOffsetPercentage * width
            : 0),
      ),
      y: Math.floor(
        height / 2 +
          (baseRandomOffsetPercentage
            ? (0.5 - Math.random()) * baseRandomOffsetPercentage * height
            : 0),
      ),
    }
  }

  handleAutoFocusUpdate() {
    if (this.cells.focused) {
      this.update = this.handleFirstUpdate
      return
    }

    this.handleUpdate()
  }

  assignPointer(data) {
    Object.assign(this.pointer, data)
  }

  savePointer() {
    return {
      indices: this.pointer.indices,
      x: this.pointer.x,
      y: this.pointer.y,
      speedScale: 0,
    }
  }

  updateRawPositionFromEvent(e) {
    this.rawPositionIdle = false
    if (this.rawPositionIdleTimeout) {
      clearTimeout(this.rawPositionIdleTimeout)
    }
    this.rawPositionIdleTimeout = setTimeout(() => {
      this.rawPositionIdle = true
      this.rawPositionIdleTimeout = undefined
    }, 2000)

    if (!this.rawPosition) this.rawPosition = {}
    Object.assign(this.rawPosition, {
      x: e.clientX || e.x,
      y: e.clientY || e.y,
    })
  }

  onPointerDown(e) {
    if (this.isTouching) return
    this.pointer.down = true
    this.pointer.canDrag = true
    this.pointer.downStartX = e.clientX || e.x
    this.pointer.downStartY = e.clientY || e.y
    this.logger?.debug('onPointerDown')
  }

  onPointerUp(e) {
    if (this.isTouching) return
    this.pointer.down = false
    this.pointer.canDrag = false
    this.logger?.debug('onPointerUp')
  }

  onPointerMove(e) {
    this.updateRawPositionFromEvent(e)
    if (this.pointer.canDrag && !this.pointer.dragging) {
      const currentX = e.clientX || e.x
      const currentY = e.clientY || e.y
      const deltaX = currentX - this.pointer.downStartX
      const deltaY = currentY - this.pointer.downStartY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance > 20) this.pointer.dragging = true
    }
  }

  onTouchMove(e) {
    // Single touch - let pointer events handle it
  }

  isTouching = false
  onTouchStart(e) {
    this.isTouching = true
    this.logger?.debug('onTouchStart')
  }
  onTouchEnd(e) {
    this.isTouching = false
    this.logger?.debug('onTouchEnd')
  }

  onBlur(event) {
    this.logger?.debug('onBlur')
    this.handlePointerOut()
  }

  onPointerOut(event) {
    if (this.isTouching) return
    this.logger?.debug('onPointerOut')
    this.handlePointerOut()
  }

  handlePointerOut() {
    this.reset()
  }

  onPointerClick(e) {
    if (this.pointer.dragging) {
      this.pointer.dragging = false
      return
    }
    this.updateRawPositionFromEvent(e)
    this.requestSelection()
  }

  requestSelection() {
    let selectedCellIndex
    if (!this.cells.selectedIndex) {
      if (this.pointer.index === this.cells.focusedIndex) {
        selectedCellIndex = this.cells.focusedIndex
      }
    } else {
      if (this.cells.selectedIndex !== this.cells.focusedIndex) {
        selectedCellIndex = this.pointer.index
      } else {
        this.deselect()
      }
    }

    if (selectedCellIndex) {
      this.cells.selectedIndex = selectedCellIndex
      this.dispatchEvent(new CellSelectedEvent(this.cells.selected))
      this.logger?.debug('select cell', this.cells.selectedIndex)
      return selectedCellIndex
    }
  }

  deselect() {
    this.logger?.debug('deselect')
    this.cells.selectedIndex = undefined
    this.dispatchEvent(new CellSelectedEvent(undefined))
    this.resetZoom()
  }

  initEventListeners() {
    this.logger?.debug('initEventListeners')
    // Store bound function references
    this.boundOnBlur = this.onBlur.bind(this)
    this.boundOnPointerOut = this.onPointerOut.bind(this)
    this.boundOnPointerClick = this.onPointerClick.bind(this)
    this.boundOnTouchMove = this.onTouchMove.bind(this)
    this.boundOnTouchStart = this.onTouchStart.bind(this)
    this.boundOnTouchEnd = this.onTouchEnd.bind(this)
    this.boundOnPointerMove = this.onPointerMove.bind(this)
    this.boundOnPointerDown = this.onPointerDown.bind(this)
    this.boundOnPointerUp = this.onPointerUp.bind(this)

    window.addEventListener('blur', this.boundOnBlur)
    this.container.addEventListener('pointerout', this.boundOnPointerOut)

    if (isTouchDevice) {
      // Add touch events first to ensure they fire before pointer events
      this.container.addEventListener('touchstart', this.boundOnTouchStart)
      this.container.addEventListener('touchmove', this.boundOnTouchMove)
      this.container.addEventListener('touchend', this.boundOnTouchEnd)
    } else {
      this.container.addEventListener('pointerdown', this.boundOnPointerDown)
      this.container.addEventListener('pointerup', this.boundOnPointerUp)
    }

    this.container.addEventListener('click', this.boundOnPointerClick)
    this.container.addEventListener('pointermove', this.boundOnPointerMove)
  }

  removeEventListeners() {
    window.removeEventListener('blur', this.boundOnBlur)

    this.container.removeEventListener('click', this.boundOnPointerClick)
    this.container.removeEventListener('pointermove', this.boundOnPointerMove)
    this.container.removeEventListener('pointerout', this.boundOnPointerOut)

    if (isTouchDevice) {
      this.container.removeEventListener('touchmove', this.boundOnTouchMove)
      this.container.removeEventListener('touchstart', this.boundOnTouchStart)
      this.container.removeEventListener('touchend', this.boundOnTouchEnd)
    } else {
      this.container.removeEventListener('pointerdown', this.boundOnPointerDown)
      this.container.removeEventListener('pointerup', this.boundOnPointerUp)
    }
  }

  isResizing = false
  startResize(dimensions) {
    this.logger?.debug('startResize')
    this.updateBounds()
    this.isResizing = true
    this.assignPointer({
      x: undefined,
      y: undefined,
      indices: undefined,
      speedScale: 0,
    })
    this.reset()
  }

  endResize(dimensions) {
    this.logger?.debug('endResize')
    this.isResizing = false
    if (!this.cells.focused || this.outOfBounds(this.cells.focused)) {
      this.focusCell(undefined)
      if (autoFocusCenterEnabled(this.config)) {
        this.assignPointer(this.getAutoFocusCenter())
      }
      return
    }
    this.assignPointer({
      x: this.cells.focused.x,
      y: this.cells.focused.y,
    })
    this.dispatchEvent(new CellFocusedEvent(this.cells.focused, this.cells))
  }

  boundsPadding = 10
  updateBounds() {
    const { width, height } = this.dimensions.get()
    this.bounds = [
      this.boundsPadding,
      this.boundsPadding,
      width - this.boundsPadding,
      height - this.boundsPadding,
    ]
  }

  clampToBounds(position) {
    position.x = Math.min(Math.max(position.x, this.bounds[0]), this.bounds[2])
    position.y = Math.min(Math.max(position.y, this.bounds[1]), this.bounds[3])
    return position
  }

  outOfBounds(position) {
    return !(
      position.x >= this.bounds[0] &&
      position.x <= this.bounds[2] &&
      position.y >= this.bounds[1] &&
      position.y <= this.bounds[3]
    )
  }

  selectCell(cellOrCellIndex) {
    const cellIndex = getCellIndex(cellOrCellIndex)
    if (this.cells.selectedIndex !== cellIndex) {
      this.cells.selectedIndex = cellIndex
      this.dispatchEvent(new CellSelectedEvent(this.cells.selected, this.cells))
      this.logger?.debug('select cell', this.cells.selectedIndex)
    }
  }

  focusCell(cellOrCellIndex) {
    const cellIndex = getCellIndex(cellOrCellIndex)
    if (this.cells.focusedIndex !== cellIndex) {
      this.cells.focusedIndex = cellIndex
      this.dispatchEvent(new CellFocusedEvent(this.cells.focused, this.cells))
    }
  }

  hasSelection() {
    return this.cells.selectedIndex !== undefined
  }

  hasFocus() {
    return this.cells.focusedIndex !== undefined
  }

  focusedIsSelected() {
    return this.cells.focusedIndex === this.cells.selectedIndex
  }

  resize(dimensions) {
    this.startResize()
    this.endResize()
  }

  dispose() {
    this.removeEventListeners()
  }
}
