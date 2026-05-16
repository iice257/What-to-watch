/*
  Minimal custom telemetry utility (opt-in)
  - Disabled by default; enable via config.telemetry.enabled or env vars.
  - When enabled and an endpoint is provided, events are sent via sendBeacon/fetch(keepalive).
  - If enabled but no endpoint is set, events are only logged to console (for local dev insights).
  - Privacy: Captures only error details and coarse device info (UA string, platform, HW concurrency,
    device memory, screen metrics, and WebGL vendor/renderer if available) plus app-specific device class
    from store. No PII is intentionally collected. See README Privacy & Telemetry section.
*/

import { store } from '../../store'

export type TelemetryInitConfig = {
  enabled: boolean
  endpoint?: string
  appVersion?: string
  sampleRate?: number // reserved for future use
}

type DeviceInfo = {
  userAgent?: string
  platform?: string
  language?: string
  languages?: readonly string[]
  hardwareConcurrency?: number
  deviceMemory?: number | undefined
  screen?: { width: number; height: number; pixelRatio: number }
  webgl?: {
    supported: boolean
    vendor?: string | null
    renderer?: string | null
    version?: string | null
  }
  deviceClass?: unknown
  estimatedDeviceClass?: unknown
}

type ErrorEventPayload = {
  type: 'error'
  ts: number
  url?: string
  appVersion?: string
  message?: string
  name?: string
  stack?: string
  source?: string
  componentStack?: string | null
  extra?: Record<string, unknown>
  device: DeviceInfo
}

const state: {
  inited: boolean
  enabled: boolean
  endpoint?: string
  appVersion?: string
  device?: DeviceInfo
} = {
  inited: false,
  enabled: false,
}

function collectWebGLInfo(): DeviceInfo['webgl'] {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return { supported: false }
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as {
      UNMASKED_VENDOR_WEBGL: number
      UNMASKED_RENDERER_WEBGL: number
    } | null
    const vendor = ext
      ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR)
    const renderer = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER)
    const version = gl.getParameter(gl.VERSION)
    return { supported: true, vendor, renderer, version }
  } catch {
    return { supported: false }
  }
}

function collectDeviceInfo(): DeviceInfo {
  if (state.device) return state.device
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
    const scr = typeof screen !== 'undefined' ? screen : ({} as Screen)
    const device: DeviceInfo = {
      userAgent: nav.userAgent,
      platform: nav.platform,
      language: nav.language,
      languages: nav.languages,
      hardwareConcurrency: nav.hardwareConcurrency,
      // @ts-ignore device specific
      deviceMemory: nav.deviceMemory,
      screen: {
        width: scr.width ?? 0,
        height: scr.height ?? 0,
        pixelRatio:
          typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1,
      },
      webgl:
        typeof document !== 'undefined'
          ? collectWebGLInfo()
          : { supported: false },
    }
    // pull device class from store if available
    try {
      const s = store.getState?.()
      device.deviceClass = s?.deviceClass
      device.estimatedDeviceClass = s?.estimatedDeviceClass
    } catch {}

    state.device = device
    return device
  } catch {
    const fallback: DeviceInfo = {
      userAgent: undefined,
      webgl: { supported: false },
    }
    state.device = fallback
    return fallback
  }
}

function send(payload: ErrorEventPayload) {
  if (!state.enabled) return

  // Prefer sendBeacon when endpoint is provided
  if (state.endpoint) {
    try {
      const body = JSON.stringify(payload)
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(state.endpoint, blob)
      } else if (typeof fetch !== 'undefined') {
        // keepalive so it can run during page unload
        void fetch(state.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
          mode: 'no-cors',
        })
      }
    } catch (e) {
      // Swallow network errors to avoid cascading failures
      if (import.meta.env.DEV) console.debug('[telemetry] send failed', e)
    }
  } else if (import.meta.env.DEV) {
    // In dev, log to console when enabled but no endpoint set
    // In prod with no endpoint, remain silent to avoid noise
    console.debug('[telemetry] event', payload)
  }
}

export const customTelemetry = {
  init(cfg: TelemetryInitConfig) {
    state.enabled = Boolean(cfg?.enabled)
    state.endpoint = cfg?.endpoint
    state.appVersion = cfg?.appVersion
    state.inited = true
    // Warm device info cache (non-blocking)
    try {
      if (state.enabled) void collectDeviceInfo()
    } catch {}
  },
  isEnabled() {
    return Boolean(state.enabled)
  },
  captureError(
    error: unknown,
    ctx?: {
      source?: string
      componentStack?: string | null
      extra?: Record<string, unknown>
    },
  ) {
    if (!state.inited || !state.enabled) return

    let message: string | undefined
    let name: string | undefined
    let stack: string | undefined

    if (error instanceof Error) {
      message = error.message
      name = error.name
      stack = error.stack
    } else if (typeof error === 'string') {
      message = error
      name = 'Error'
    } else if (error && typeof error === 'object') {
      try {
        message =
          'message' in error && typeof error.message === 'string'
            ? error.message
            : JSON.stringify(error)
        name =
          'name' in error && typeof error.name === 'string'
            ? error.name
            : 'Error'
        stack =
          'stack' in error && typeof error.stack === 'string'
            ? error.stack
            : undefined
      } catch {
        message = 'Unknown error'
      }
    }

    const payload: ErrorEventPayload = {
      type: 'error',
      ts: Date.now(),
      url: typeof location !== 'undefined' ? location.href : undefined,
      appVersion: state.appVersion,
      message,
      name,
      stack,
      source: ctx?.source,
      componentStack: ctx?.componentStack,
      extra: ctx?.extra,
      device: collectDeviceInfo(),
    }

    send(payload)
  },
  capturePerfSnapshot(extra?: Record<string, unknown>) {
    if (!state.inited || !state.enabled) return
    const device = collectDeviceInfo()
    const payload = {
      type: 'perf',
      ts: Date.now(),
      url: typeof location !== 'undefined' ? location.href : undefined,
      appVersion: state.appVersion,
      extra,
      device,
    }
    // Reuse sender; typed loosely for this non-critical event
    // @ts-ignore
    send(payload)
  },
}

export default customTelemetry
