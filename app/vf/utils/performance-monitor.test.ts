import { afterEach, describe, expect, it, vi } from 'vitest'
import { initPerformanceMonitor } from './performance-monitor'

describe('performance monitor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.__W2W_PERF__ = undefined
  })

  it('publishes rolling FPS metrics to subscribers and the console anchor', () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const monitor = initPerformanceMonitor()
    const onFrame = vi.fn()
    monitor.subscribe({ onFrame })

    for (const timestamp of [16, 32, 48, 64, 80]) {
      now = timestamp
      monitor.onTick()
    }

    expect(onFrame).toHaveBeenCalledTimes(5)
    expect(monitor.getSnapshot()).toMatchObject({
      currentFps: 62.5,
      avg1s: 62.5,
      avg5s: 62.5,
      low1Percent: 62.5,
      frameMs: 16,
      sampleCount: 5,
      visible: true,
    })
    expect(window.__W2W_PERF__).toMatchObject(monitor.getSnapshot())
  })

  it('does not publish fake FPS during warm-up after a long pause', () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    const monitor = initPerformanceMonitor()

    now = 1000
    monitor.onTick()

    for (const timestamp of [1016, 1032, 1048, 1064]) {
      now = timestamp
      monitor.onTick()
    }

    expect(monitor.getSnapshot()).toMatchObject({
      currentFps: 0,
      avg1s: 0,
      avg5s: 0,
      low1Percent: 0,
      sampleCount: 4,
    })
  })
})
