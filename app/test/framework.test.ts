import { describe, expect, it, vi } from 'vitest'

describe('Test Framework', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to vi global', () => {
    expect(typeof vi).toBe('object')
    expect(typeof vi.fn).toBe('function')
  })

  it('should have jsdom environment', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
    expect(document.createElement('div')).toBeInstanceOf(Element)
  })

  it('should have localStorage mock', () => {
    localStorage.setItem('test', 'value')
    expect(localStorage.getItem('test')).toBe('value')
  })
})
