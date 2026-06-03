import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { store } from '../../../store'
import { initPerformanceMonitor } from '../../../vf/utils/performance-monitor'
import { PerformanceHud } from './performance-hud'

const HUD_PINNED_KEY = 'w2w-perf-hud-pinned'
const HUD_COLLAPSED_KEY = 'w2w-perf-hud-collapsed-v2'

describe('PerformanceHud', () => {
  beforeEach(() => {
    localStorage.removeItem(HUD_PINNED_KEY)
    localStorage.removeItem(HUD_COLLAPSED_KEY)
    store.setState({
      performanceMonitor: initPerformanceMonitor(),
      uiVisible: true,
    })
  })

  it('follows the interface visibility eye when not pinned', () => {
    render(<PerformanceHud />)

    expect(screen.getByTestId('performance-hud')).toBeInTheDocument()

    act(() => {
      store.getState().setUiVisible(false)
    })

    expect(screen.queryByTestId('performance-hud')).not.toBeInTheDocument()

    act(() => {
      store.getState().setUiVisible(true)
    })

    expect(screen.getByTestId('performance-hud')).toBeInTheDocument()
  })

  it('stays visible while pinned even when the interface is hidden', async () => {
    const user = userEvent.setup()
    localStorage.setItem(HUD_PINNED_KEY, 'true')
    store.setState({ uiVisible: false })

    render(<PerformanceHud />)

    expect(screen.getByTestId('performance-hud')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Unpin FPS HUD'))

    expect(screen.queryByTestId('performance-hud')).not.toBeInTheDocument()
  })
})
