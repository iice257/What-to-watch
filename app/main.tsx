import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import ErrorBoundary from './cmps/common/error-boundary'
import { TestGalleryApp } from './cmps/views/test-gallery'
import config from './config'
import { animateDocTitleSuffix } from './utils/anim'
import { initTelemetry } from './utils/telemetry/init-telemetry'
import { initVoroforce } from './vf'
import { Voroforce } from './voroforce'
import './styles.css'

initTelemetry()

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search)
  const disableUIOverrideParam = urlParams.get('disableUI')
  const isTestGalleryRoute = window.location.pathname === '/test'

  if (isTestGalleryRoute) {
    // Keep the Phantom-style prototype isolated from the Voroforce renderer.
    document.body.dataset.route = 'test-gallery'
    document.getElementById('voroforce')?.setAttribute('aria-hidden', 'true')
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <TestGalleryApp />
        </ErrorBoundary>
      </StrictMode>,
    )
    animateDocTitleSuffix()
    return
  }

  if (!config.disableUI && !disableUIOverrideParam) {
    // biome-ignore lint/style/noNonNullAssertion: exists
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
          <Voroforce />
        </ErrorBoundary>
      </StrictMode>,
    )
  } else {
    void initVoroforce({ force: true })
  }
  animateDocTitleSuffix()
})
