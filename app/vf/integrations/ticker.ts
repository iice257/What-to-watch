import type { VisibilityChangeEvent } from '√'
import { store } from '../../store'
import { handleTransitioningUniforms, initPerformanceMonitor } from '../utils'

export const handleTicker = () => {
  const {
    voroforce,
    configUniforms: { transitioning: transitioningUniforms },
  } = store.getState()

  if (!voroforce) return

  const performanceMonitor = initPerformanceMonitor()
  store.setState({
    performanceMonitor,
  })

  voroforce.ticker.listen('tick', (() => {
    handleTransitioningUniforms(transitioningUniforms)
    performanceMonitor.onTick()
  }) as unknown as EventListener)

  voroforce.listen('visibilityChange', ((e: VisibilityChangeEvent) => {
    performanceMonitor.onVisibilityChange(e.visible)
  }) as unknown as EventListener)
}
