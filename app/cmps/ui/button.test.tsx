import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, buttonVariants } from './button'

describe('Button', () => {
  it('should render with default variant and size', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
  })

  it('should apply variant classes', () => {
    render(<Button variant='outline'>Outline Button</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('border')
    expect(button).toHaveClass('border-input')
  })

  it('should apply size classes', () => {
    render(<Button size='sm'>Small Button</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('rounded-md')
    expect(button).toHaveClass('px-3')
  })

  it('should handle onClick events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick}>Clickable</Button>)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none')
  })

  it('should apply custom className alongside variant classes', () => {
    render(<Button className='custom-class'>Custom</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('inline-flex') // Default variant class
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()

    render(<Button ref={ref}>Button with ref</Button>)

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
  })

  describe('variants', () => {
    const variants = [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ] as const

    variants.forEach((variant) => {
      it(`should match snapshot for ${variant} variant`, () => {
        const { container } = render(
          <Button variant={variant}>{variant} Button</Button>,
        )

        expect(container.firstChild).toMatchSnapshot(
          `button-variant-${variant}`,
        )
      })
    })
  })

  describe('sizes', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const

    sizes.forEach((size) => {
      it(`should match snapshot for ${size} size`, () => {
        const { container } = render(<Button size={size}>{size} Button</Button>)

        expect(container.firstChild).toMatchSnapshot(`button-size-${size}`)
      })
    })
  })

  describe('buttonVariants function', () => {
    it('should return correct classes for different combinations', () => {
      const defaultClasses = buttonVariants()
      expect(typeof defaultClasses).toBe('string')
      expect(defaultClasses).toContain('inline-flex')

      const outlineSmallClasses = buttonVariants({
        variant: 'outline',
        size: 'sm',
      })
      expect(outlineSmallClasses).toContain('border-input')
      expect(outlineSmallClasses).toContain('px-3')
    })
  })
})
