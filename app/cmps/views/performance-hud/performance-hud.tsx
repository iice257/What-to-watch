import { Activity, ChevronDown, ChevronUp, Pin, PinOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useShallowState } from '../../../store'
import type { PerformanceMetrics } from '../../../vf'
import { Button } from '../../ui/button'

const HUD_COLLAPSED_KEY = 'w2w-perf-hud-collapsed-v2'
const HUD_PINNED_KEY = 'w2w-perf-hud-pinned'

const readStoredBoolean = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === null) return fallback
  return value === 'true'
}

const writeStoredBoolean = (key: string, value: boolean) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, String(value))
}

const getToneClass = (fps: number) => {
  if (fps >= 40) return 'text-emerald-300'
  if (fps >= 28) return 'text-amber-300'
  return 'text-red-300'
}

const emptyMetrics: PerformanceMetrics = {
  currentFps: 0,
  avg1s: 0,
  avg5s: 0,
  low1Percent: 0,
  frameMs: 0,
  worstFrameMs: 0,
  sampleCount: 0,
  lastUpdated: 0,
  visible: true,
}

export const PerformanceHud = () => {
  const { performanceMonitor, uiVisible } = useShallowState((state) => ({
    performanceMonitor: state.performanceMonitor,
    uiVisible: state.uiVisible,
  }))
  const [metrics, setMetrics] = useState<PerformanceMetrics>(
    () => performanceMonitor?.getSnapshot() ?? emptyMetrics,
  )
  const [collapsed, setCollapsed] = useState(() =>
    readStoredBoolean(HUD_COLLAPSED_KEY, true),
  )
  const [pinned, setPinned] = useState(() =>
    readStoredBoolean(HUD_PINNED_KEY, false),
  )

  useEffect(() => {
    if (!performanceMonitor) return
    let lastHudUpdate = 0

    setMetrics(performanceMonitor.getSnapshot())

    return performanceMonitor.subscribe({
      onFrame: (api) => {
        const snapshot = api.getSnapshot()
        if (snapshot.lastUpdated - lastHudUpdate < 250) return
        lastHudUpdate = snapshot.lastUpdated
        setMetrics(snapshot)
      },
    })
  }, [performanceMonitor])

  useEffect(() => {
    writeStoredBoolean(HUD_COLLAPSED_KEY, collapsed)
  }, [collapsed])

  useEffect(() => {
    writeStoredBoolean(HUD_PINNED_KEY, pinned)
  }, [pinned])

  const toneClass = useMemo(() => getToneClass(metrics.avg1s), [metrics.avg1s])
  const shouldRender = uiVisible || pinned

  if (!performanceMonitor || !shouldRender) return null

  return (
    <div
      className='pointer-events-auto fixed right-3 bottom-12 z-40 max-w-[calc(100vw-1.5rem)] rounded-md border border-white/15 bg-black/80 px-2.5 py-2 text-white md:right-9 md:bottom-9'
      data-perf-hud
      data-testid='performance-hud'
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className='flex items-center gap-2'>
        <Activity className='h-3.5 w-3.5 text-white/70' />
        <button
          type='button'
          className='flex items-baseline gap-1 text-left'
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand FPS details' : 'Collapse FPS details'}
        >
          <span className='font-black text-[0.65rem] text-white/45 uppercase tracking-wide'>
            FPS
          </span>
          <span className={`font-mono font-semibold text-sm ${toneClass}`}>
            {metrics.avg1s.toFixed(1)}
          </span>
        </button>
        <Button
          variant='ghost'
          size='icon'
          className='h-5 w-5 rounded-sm text-white/70 hover:text-white [&_svg]:h-3.5 [&_svg]:w-3.5'
          aria-label={pinned ? 'Unpin FPS HUD' : 'Pin FPS HUD'}
          onClick={() => setPinned((value) => !value)}
        >
          {pinned ? <Pin /> : <PinOff />}
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-5 w-5 rounded-sm text-white/70 hover:text-white [&_svg]:h-3.5 [&_svg]:w-3.5'
          aria-label={collapsed ? 'Expand FPS details' : 'Collapse FPS details'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
      {!collapsed && (
        <div className='mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[0.65rem] text-white/65 leading-tight'>
          <div>1s avg</div>
          <div className='text-right'>{metrics.avg1s.toFixed(1)}</div>
          <div>5s avg</div>
          <div className='text-right'>{metrics.avg5s.toFixed(1)}</div>
          <div>1% low</div>
          <div className='text-right'>{metrics.low1Percent.toFixed(1)}</div>
          <div>worst ms</div>
          <div className='text-right'>{metrics.worstFrameMs.toFixed(1)}</div>
          <div>samples</div>
          <div className='text-right'>{metrics.sampleCount}</div>
        </div>
      )}
    </div>
  )
}
