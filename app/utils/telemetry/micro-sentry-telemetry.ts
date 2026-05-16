/*
  micro sentry telemetry utility (opt-in)
  - Disabled by default; enable via config.telemetry.enabled or env vars.
  - Privacy: Captures only error details
*/

import { BrowserMicroSentryClient } from '@micro-sentry/browser'

export type TelemetryInitConfig = {
  enabled: boolean
  endpoint?: string
  appVersion?: string
  sampleRate?: number // reserved for future use
}

const state: {
  enabled: boolean
  endpoint?: string
  client?: BrowserMicroSentryClient
} = {
  enabled: false,
}

export const microSentryTelemetry = {
  init(cfg: TelemetryInitConfig) {
    state.enabled = Boolean(cfg?.enabled)
    state.endpoint = cfg?.endpoint
    if (!state.enabled || !state.endpoint) return
    state.client = new BrowserMicroSentryClient({
      dsn: state.endpoint,
    })
  },
  isEnabled() {
    return Boolean(state.enabled)
  },
  captureError(error: unknown, _ctx?: unknown) {
    if (!state.enabled) return

    state.client?.report(error as Error)
    if (import.meta.env.DEV) console.error('[telemetry] captureError', error)
  },
}

export default microSentryTelemetry
