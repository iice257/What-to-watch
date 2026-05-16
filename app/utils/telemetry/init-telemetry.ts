import config from '../../config'
// import telemetry from './custom-telemetry'
import microSentryTelemetry from './micro-sentry-telemetry'

export function initTelemetry() {
  try {
    microSentryTelemetry.init({
      enabled: Boolean(config.telemetry?.enabled),
      endpoint: config.telemetry?.endpoint,
      appVersion: config.telemetry?.appVersion,
    })
    if (microSentryTelemetry.isEnabled() && typeof window !== 'undefined') {
      const w = window as Window & { __ntwTelemetryHandlersInstalled?: boolean }
      if (!w.__ntwTelemetryHandlersInstalled) {
        window.addEventListener('error', (event) => {
          try {
            microSentryTelemetry.captureError(
              (event as ErrorEvent).error ?? (event as ErrorEvent).message,
              {
                source: 'window.error',
              },
            )
          } catch {}
        })
        window.addEventListener('unhandledrejection', (event) => {
          try {
            microSentryTelemetry.captureError(
              (event as PromiseRejectionEvent).reason,
              {
                source: 'window.unhandledrejection',
              },
            )
          } catch {}
        })
        w.__ntwTelemetryHandlersInstalled = true
      }
    }
  } catch {}
}
