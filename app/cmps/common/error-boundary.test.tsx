import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './error-boundary'

// Mock the telemetry module
vi.mock('../../utils/telemetry/micro-sentry-telemetry', () => ({
  default: {
    captureError: vi.fn(),
  },
}))

// Mock the config module
vi.mock('../../config', () => ({
  default: {
    sourceCodeUrl: 'https://github.com/example/repo',
  },
}))

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should render error UI when child component throws', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText(/The app encountered an unexpected error/),
    ).toBeInTheDocument()

    // Should show error details
    expect(screen.getByText(/Test error message/)).toBeInTheDocument()

    // Should show action buttons
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /copy details/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /report issue/i }),
    ).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('should match snapshot for error state', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(container.firstChild).toMatchSnapshot()

    consoleSpy.mockRestore()
  })

  it('should match snapshot for normal state', () => {
    const { container } = render(
      <ErrorBoundary>
        <div data-testid='child-content'>Test content</div>
      </ErrorBoundary>,
    )

    expect(container.firstChild).toMatchSnapshot()
  })
})
