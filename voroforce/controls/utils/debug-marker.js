import { setStyles } from '../../utils'

export class DebugMarker {
  constructor(container) {
    this.container = container
    this.element = document.createElement('div')
    this.container.appendChild(this.element)
    setStyles(this.element, {
      width: '20px',
      height: '20px',
      'background-color': 'red',
      'border-radius': '50%',
      'pointer-events': 'none',
      position: 'absolute',
      top: 0,
      left: 0,
      'z-index': 10,
      transform: 'translate(-50%, -50%)',
    })
  }

  updatePosition(position) {
    setStyles(this.element, {
      left: `${position.x}px`,
      top: `${position.y}px`,
    })
  }

  updateColor(color) {
    setStyles(this.element, {
      'background-color': color,
    })
  }

  destroy() {
    this.container.removeChild(this.element)
    this.element = null
  }
}
