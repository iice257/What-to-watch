import { render, screen } from '@testing-library/react'
import type React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DeviceClassSelector } from './device-class-selector'

// Mock the Selector component
vi.mock('../selector', () => ({
  Selector: ({
    className,
    defaultValue,
    onValueChange,
    items,
    ...props
  }: {
    className?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    items?: Array<{ value: string; label: string; addon?: React.ReactNode }>
    [key: string]: unknown
  }) => (
    <div
      className={className}
      data-testid='device-class-selector'
      data-value={defaultValue}
      onClick={() => onValueChange?.(defaultValue || '')}
      {...props}
    >
      {items?.map(
        (
          item: { value: string; label: string; addon?: React.ReactNode },
          index: number,
        ) => (
          <div key={item.value || index} data-value={item.value}>
            {item.label}
            {item.addon}
          </div>
        ),
      )}
    </div>
  ),
}))

// Mock device class constants and utilities
vi.mock('../../../vf/consts', () => ({
  DEVICE_CLASS: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
  },
  DEVICE_CLASS_LABELS: {
    1: 'Low-end',
    2: 'Mid-range',
    3: 'High-end',
    4: 'Flagship',
  },
  DEVICE_CLASS_ITEMS: [
    { value: 1, label: 'Low-end' },
    { value: 2, label: 'Mid-range' },
    { value: 3, label: 'High-end' },
    { value: 4, label: 'Flagship' },
  ],
}))

vi.mock('../../../vf/utils', () => ({
  getDeviceClassLabel: vi.fn((deviceClass: number) => {
    const labels = {
      1: 'Low-end',
      2: 'Mid-range',
      3: 'High-end',
      4: 'Flagship',
    }
    return labels[deviceClass as keyof typeof labels] || 'Unknown'
  }),
}))

describe('DeviceClassSelector', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('should render with default props', () => {
    render(<DeviceClassSelector value={2} onValueChange={mockOnChange} />)

    expect(screen.getByText('Your device')).toBeInTheDocument()
    expect(screen.getByTestId('device-class-selector')).toBeInTheDocument()
  })

  it('should render with custom className', () => {
    render(
      <DeviceClassSelector
        value={3}
        onValueChange={mockOnChange}
        className='custom-class'
      />,
    )

    const selector = screen.getByTestId('device-class-selector')
    expect(selector).toHaveClass('custom-class')
  })

  it('should have correct default value', () => {
    render(<DeviceClassSelector value={3} onValueChange={mockOnChange} />)

    const selector = screen.getByTestId('device-class-selector')
    expect(selector).toHaveAttribute('data-value', '3')
  })

  it('should match snapshot with deterministic props', () => {
    const { container } = render(
      <DeviceClassSelector
        value={2}
        onValueChange={mockOnChange}
        className='test-class'
      />,
    )

    expect(container.firstChild).toMatchSnapshot()
  })

  it('should match snapshot with different device class values', () => {
    const deviceClasses = [1, 2, 3, 4]

    deviceClasses.forEach((deviceClass) => {
      const { container } = render(
        <DeviceClassSelector
          value={deviceClass}
          onValueChange={mockOnChange}
        />,
      )

      expect(container.firstChild).toMatchSnapshot(
        `device-class-${deviceClass}`,
      )
    })
  })
})
