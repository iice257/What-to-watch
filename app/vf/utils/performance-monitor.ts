type PerformanceMonitorSubscriptionApi = {
  onIncline: (api: PerformanceMonitorApi) => void
  onDecline: (api: PerformanceMonitorApi) => void
  onChange: (api: PerformanceMonitorApi) => void
  onFallback: (api: PerformanceMonitorApi) => void
  onFrame: (api: PerformanceMonitorApi) => void
}

export type PerformanceMetrics = {
  /** Last frame's instantaneous FPS */
  currentFps: number
  /** Average FPS across the last 1s */
  avg1s: number
  /** Average FPS across the last 5s */
  avg5s: number
  /** 1% low FPS proxy across the last 5s, based on p99 frame time */
  low1Percent: number
  /** Last frame duration */
  frameMs: number
  /** Worst frame duration across the last 5s */
  worstFrameMs: number
  /** Number of frame samples in the 5s window */
  sampleCount: number
  /** Last update timestamp from performance.now() */
  lastUpdated: number
  visible: boolean
}

type FrameSample = {
  time: number
  delta: number
}

type FrameWindowStats = {
  avg1s: number
  avg5s: number
  low1Percent: number
  worstFrameMs: number
  sampleCount: number
}

export type PerformanceMonitorApi = {
  /** Whether the page is visible */
  visible: boolean
  /** Current fps */
  fps: number
  /** Current performance factor, between 0 and 1 */
  factor: number
  /** Current highest fps, you can use this to determine device refresh rate */
  refreshRate: number
  /** Fps samples taken over time  */
  samples: number[]
  /** Averages of frames taken over n iterations   */
  averages: number[]
  index: number
  flipped: number
  fallback: boolean
  metrics: PerformanceMetrics
  subscriptions: Map<symbol, Partial<PerformanceMonitorSubscriptionApi>>
  subscribe: (sub: Partial<PerformanceMonitorSubscriptionApi>) => () => void
  getSnapshot: () => PerformanceMetrics
  onTick: () => void
  onVisibilityChange: (visible: boolean) => void
}

declare global {
  interface Window {
    __W2W_PERF__?: PerformanceMetrics
  }
}

type PerformanceMonitorProps = {
  /** How much time in milliseconds to collect an average fps, 250 */
  ms?: number
  /** How many interations of averages to collect, 10 */
  iterations?: number
  /** The percentage of iterations that are matched against the lower and upper bounds, 0.75 */
  threshold?: number
  /** A function that receive the max device refreshRate to determine lower and upper bounds which create a margin where neither incline nor decline should happen, (refreshRate) => (refreshRate > 90 ? [50, 90] : [50, 60]) */
  bounds?: (refreshRate: number) => [lower: number, upper: number]
  /** How many times it can inline or decline before onFallback is called, Infinity */
  flipflops?: number
  /** The factor increases and decreases between 0-1, this prop sets the starting value, 0.5 */
  factor?: number
  /** The step that gets added or subtracted to or from the factor on each incline/decline, 0.1 */
  step?: number
  /** When performance is higher than the upper bound (good!) */
  onIncline?: (api: PerformanceMonitorApi) => void
  /** When performance is lower than the upper bound (bad!) */
  onDecline?: (api: PerformanceMonitorApi) => void
  /** Incline and decline will change the factor, this will trigger when that happened */
  onChange?: (api: PerformanceMonitorApi) => void
  /** Called after when the number of flipflops is reached, it indicates instability, use the function to set a fixed baseline */
  onFallback?: (api: PerformanceMonitorApi) => void
}

export function initPerformanceMonitor(
  {
    iterations = 10,
    ms = 250,
    // ms = 1000,
    threshold = 0.75,
    // threshold = 0.25,
    step = 0.1,
    factor: _factor = 0.5,
    flipflops = Number.POSITIVE_INFINITY,
    bounds = (refreshRate) => (refreshRate > 100 ? [60, 100] : [50, 60]),
    onIncline,
    onDecline,
    onChange,
    onFallback,
  }: PerformanceMonitorProps = {} as PerformanceMonitorProps,
) {
  const decimalPlacesRatio = 10 ** 0
  let lastFactor = 0
  let previous = performance.now()
  let frameSamples: FrameSample[] = []

  const round = (value: number) => Math.round(value * 10) / 10
  const calcLiveFps = (samples: FrameSample[], delta: number) => {
    if (samples.length < 5) return 0
    return round(1000 / delta)
  }
  const calcWindowStats = (
    samples: FrameSample[],
    now: number,
  ): FrameWindowStats => {
    if (!samples.length) {
      return {
        avg1s: 0,
        avg5s: 0,
        low1Percent: 0,
        worstFrameMs: 0,
        sampleCount: 0,
      }
    }

    let total1sMs = 0
    let count1s = 0
    let total5sMs = 0
    let count5s = 0
    let worstDelta = 0
    const slowestLimit = Math.max(1, Math.ceil(samples.length * 0.01))
    const slowestDeltas: number[] = []

    for (const sample of samples) {
      total5sMs += sample.delta
      count5s += 1
      worstDelta = Math.max(worstDelta, sample.delta)

      const insertAt = slowestDeltas.findIndex((delta) => sample.delta > delta)
      if (insertAt === -1) {
        if (slowestDeltas.length < slowestLimit)
          slowestDeltas.push(sample.delta)
      } else {
        slowestDeltas.splice(insertAt, 0, sample.delta)
        if (slowestDeltas.length > slowestLimit) slowestDeltas.pop()
      }

      if (now - sample.time <= 1000) {
        total1sMs += sample.delta
        count1s += 1
      }
    }

    return {
      avg1s: count1s ? round((count1s / total1sMs) * 1000) : 0,
      avg5s: count5s ? round((count5s / total5sMs) * 1000) : 0,
      low1Percent:
        samples.length < 5 ? 0 : round(1000 / slowestDeltas[slowestLimit - 1]),
      worstFrameMs: round(worstDelta),
      sampleCount: count5s,
    }
  }

  const api: PerformanceMonitorApi = {
    visible: true,
    fps: 0,
    index: 0,
    factor: _factor,
    flipped: 0,
    refreshRate: 0,
    fallback: false,
    metrics: {
      currentFps: 0,
      avg1s: 0,
      avg5s: 0,
      low1Percent: 0,
      frameMs: 0,
      worstFrameMs: 0,
      sampleCount: 0,
      lastUpdated: previous,
      visible: true,
    },
    samples: [],
    averages: [],
    subscriptions: new Map(),
    subscribe: (sub) => {
      const key = Symbol()
      api.subscriptions.set(key, sub)
      return () => void api.subscriptions.delete(key)
    },
    getSnapshot: () => ({ ...api.metrics }),
    onVisibilityChange: (visible) => {
      api.visible = visible
      api.metrics.visible = visible
      api.samples = []
      frameSamples = []
    },
    onTick: () => {
      const { samples, averages } = api

      const now = performance.now()
      const delta = now - previous
      previous = now

      if (delta > 500) {
        // Throttling or sleep likely happening
        api.samples = []
        frameSamples = []
        return
      }

      frameSamples.push({ time: now, delta })
      frameSamples = frameSamples.filter((sample) => now - sample.time <= 5000)
      const windowStats = calcWindowStats(frameSamples, now)

      api.metrics = {
        currentFps: calcLiveFps(frameSamples, delta),
        avg1s: frameSamples.length < 5 ? 0 : windowStats.avg1s,
        avg5s: frameSamples.length < 5 ? 0 : windowStats.avg5s,
        low1Percent: windowStats.low1Percent,
        frameMs: round(delta),
        worstFrameMs: windowStats.worstFrameMs,
        sampleCount: windowStats.sampleCount,
        lastUpdated: round(now),
        visible: api.visible,
      }
      api.fps = api.metrics.avg1s

      if (typeof window !== 'undefined') {
        window.__W2W_PERF__ = api.getSnapshot()
      }
      api.subscriptions.forEach((sub) => sub.onFrame?.(api))

      if (api.fallback) return // If the fallback has been reached, abort
      if (averages.length >= iterations) return

      samples.push(now)
      const msPassed = samples[samples.length - 1] - samples[0]

      if (msPassed < ms) return

      api.fps =
        Math.round((samples.length / msPassed) * 1000 * decimalPlacesRatio) /
        decimalPlacesRatio

      api.samples = []

      api.refreshRate = Math.max(api.refreshRate, api.fps)
      averages[api.index++ % iterations] = api.fps

      if (averages.length !== iterations) return

      const [lower, upper] = bounds(api.refreshRate)
      const upperBounds = averages.filter((value) => value >= upper)
      const lowerBounds = averages.filter((value) => value < lower)
      // Trigger incline when more than -threshold- avgs exceed the upper bound
      if (upperBounds.length > iterations * threshold) {
        api.factor = Math.min(1, api.factor + step)
        api.flipped++
        if (onIncline) onIncline(api)
        api.subscriptions.forEach((sub) => sub.onIncline?.(api))
      }
      // Trigger decline when more than -threshold- avgs are below the lower bound
      if (lowerBounds.length > iterations * threshold) {
        api.factor = Math.max(0, api.factor - step)
        api.flipped++
        if (onDecline) onDecline(api)
        api.subscriptions.forEach((sub) => sub.onDecline?.(api))
      }

      if (lastFactor !== api.factor) {
        lastFactor = api.factor
        if (onChange) onChange(api)
        api.subscriptions.forEach((sub) => sub.onChange?.(api))
      }

      if (api.flipped > flipflops && !api.fallback) {
        api.fallback = true
        if (onFallback) onFallback(api)
        api.subscriptions.forEach((sub) => sub.onFallback?.(api))
      }
      api.averages = []

      // Resetting the refreshRate creates more problems than it solves atm
      // api.refreshRate = 0
    },
  }

  return api
}
