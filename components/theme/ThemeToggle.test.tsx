import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, ThemeProvider } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

function setMatchMediaPrefersDark(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? prefersDark : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
  setMatchMediaPrefersDark(false)
})

describe('ThemeToggle', () => {
  it('starts in system mode on fresh load with OS-light and shows a sun icon with the system-choice dot', () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    const btn = screen.getByTestId('theme-toggle')
    expect(btn).toHaveAttribute('data-theme-choice', 'system')
    expect(btn).toHaveAttribute('aria-label', 'Theme: System (light)')
    expect(screen.getByTestId('theme-toggle-sun')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle-system-dot')).toBeInTheDocument()
  })

  it('starts in system mode with OS-dark and shows a moon icon with the system-choice dot', () => {
    setMatchMediaPrefersDark(true)
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    const btn = screen.getByTestId('theme-toggle')
    expect(btn).toHaveAttribute('aria-label', 'Theme: System (dark)')
    expect(screen.getByTestId('theme-toggle-moon')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle-system-dot')).toBeInTheDocument()
  })

  it('renders "Theme: Light" without the system dot when choice is light', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    const btn = screen.getByTestId('theme-toggle')
    expect(btn).toHaveAttribute('data-theme-choice', 'light')
    expect(btn).toHaveAttribute('aria-label', 'Theme: Light')
    expect(screen.queryByTestId('theme-toggle-system-dot')).not.toBeInTheDocument()
  })

  it('renders "Theme: Dark" without the system dot when choice is dark', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    const btn = screen.getByTestId('theme-toggle')
    expect(btn).toHaveAttribute('data-theme-choice', 'dark')
    expect(btn).toHaveAttribute('aria-label', 'Theme: Dark')
    expect(screen.queryByTestId('theme-toggle-system-dot')).not.toBeInTheDocument()
  })

  it('cycles system → light → dark → system on successive clicks', () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
    const btn = screen.getByTestId('theme-toggle')

    expect(btn).toHaveAttribute('data-theme-choice', 'system')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()

    act(() => { btn.click() })
    expect(btn).toHaveAttribute('data-theme-choice', 'light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    act(() => { btn.click() })
    expect(btn).toHaveAttribute('data-theme-choice', 'dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => { btn.click() })
    expect(btn).toHaveAttribute('data-theme-choice', 'system')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
})
