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

const cleanUrl = (pathname = window.location.pathname || '/') => {
  const cleanPathname = pathname === '/test' ? '/' : pathname
  if (
    window.location.pathname !== cleanPathname ||
    window.location.search ||
    window.location.hash
  ) {
    window.history.replaceState(null, '', cleanPathname)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search)
  const disableUIOverrideParam = urlParams.get('disableUI')
  const isCustomLinkImport = urlParams.has('customLinkBase64')
  if (window.location.pathname === '/test') {
    cleanUrl('/')
  }

  const isDiscoveryRoute = window.location.pathname === '/'

  if (isDiscoveryRoute) {
    cleanUrl('/')
    // Keep the discovery experience isolated from the Voroforce renderer.
    document.body.dataset.route = 'test-gallery'
    document.getElementById('voroforce')?.setAttribute('aria-hidden', 'true')
    const rootElement = document.getElementById('root')
    if (!rootElement) return

    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <TestGalleryApp />
        </ErrorBoundary>
      </StrictMode>,
    )
    animateDocTitleSuffix()
    return
  }

  if (!isCustomLinkImport) {
    cleanUrl()
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
