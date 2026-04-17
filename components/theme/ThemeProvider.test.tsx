import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from './ThemeProvider'

function Probe() {
  const { theme, choice, setChoice, toggle } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="choice">{choice}</span>
      <button data-testid="set-dark" onClick={() => setChoice('dark')}>dark</button>
      <button data-testid="set-light" onClick={() => setChoice('light')}>light</button>
      <button data-testid="set-system" onClick={() => setChoice('system')}>system</button>
      <button data-testid="toggle" onClick={toggle}>toggle</button>
    </div>
  )
}

type MediaQueryListener = (ev: { matches: boolean }) => void
interface MediaQueryMock {
  matches: boolean
  listeners: MediaQueryListener[]
}

function setMatchMediaPrefersDark(prefersDark: boolean): MediaQueryMock {
  const mock: MediaQueryMock = { matches: prefersDark, listeners: [] }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() { return query.includes('dark') ? mock.matches : false },
      media: query,
      onchange: null,
      addEventListener: vi.fn((_: string, cb: MediaQueryListener) => { mock.listeners.push(cb) }),
      removeEventListener: vi.fn((_: string, cb: MediaQueryListener) => {
        mock.listeners = mock.listeners.filter((l) => l !== cb)
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  return mock
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    setMatchMediaPrefersDark(false)
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('defaults to light when no stored value and OS prefers light', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(screen.getByTestId('choice').textContent).toBe('system')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('defaults to dark when no stored value and OS prefers dark', () => {
    setMatchMediaPrefersDark(true)
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('honors stored "dark" choice over OS preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    setMatchMediaPrefersDark(false)
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(screen.getByTestId('choice').textContent).toBe('dark')
  })

  it('setChoice("dark") writes to localStorage and adds .dark class', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    act(() => { screen.getByTestId('set-dark').click() })
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setChoice("light") writes to localStorage and removes .dark class', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    act(() => { screen.getByTestId('set-light').click() })
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle alternates between light and dark', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
    act(() => { screen.getByTestId('toggle').click() })
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    act(() => { screen.getByTestId('toggle').click() })
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('setChoice("system") removes the storage entry and reverts to OS preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    setMatchMediaPrefersDark(true)
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(screen.getByTestId('choice').textContent).toBe('light')

    act(() => { screen.getByTestId('set-system').click() })
    expect(screen.getByTestId('choice').textContent).toBe('system')
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('re-resolves when OS preference changes while choice is "system"', () => {
    const media = setMatchMediaPrefersDark(false)
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(screen.getByTestId('choice').textContent).toBe('system')

    act(() => {
      media.matches = true
      media.listeners.forEach((cb) => cb({ matches: true }))
    })
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('ignores OS preference changes when choice is explicit light', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    const media = setMatchMediaPrefersDark(false)
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')

    act(() => {
      media.matches = true
      media.listeners.forEach((cb) => cb({ matches: true }))
    })
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('falls back to system preference when localStorage.getItem throws', () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: localStorage disabled')
    })
    setMatchMediaPrefersDark(true)
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    getSpy.mockRestore()
  })
})
