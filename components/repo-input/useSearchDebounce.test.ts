import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearchDebounce } from './useSearchDebounce'

describe('useSearchDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string immediately when query is empty', () => {
    const { result } = renderHook(() => useSearchDebounce(''))
    expect(result.current).toBe('')
  })

  it('clears debounced value immediately when query becomes empty', () => {
    const { result, rerender } = renderHook(({ q }) => useSearchDebounce(q), {
      initialProps: { q: 'hello' },
    })
    // Before delay fires, debounced is still initial value
    rerender({ q: '' })
    expect(result.current).toBe('')
  })

  it('debounces updates by the default 300ms delay', () => {
    const { result, rerender } = renderHook(({ q }) => useSearchDebounce(q), {
      initialProps: { q: '' },
    })
    rerender({ q: 'react' })
    expect(result.current).toBe('')

    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current).toBe('')

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe('react')
  })

  it('uses a custom delay when provided', () => {
    const { result, rerender } = renderHook(({ q }) => useSearchDebounce(q, 500), {
      initialProps: { q: '' },
    })
    rerender({ q: 'test' })
    act(() => { vi.advanceTimersByTime(499) })
    expect(result.current).toBe('')

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe('test')
  })

  it('resets the debounce timer on each keystroke', () => {
    const { result, rerender } = renderHook(({ q }) => useSearchDebounce(q), {
      initialProps: { q: '' },
    })
    rerender({ q: 'r' })
    act(() => { vi.advanceTimersByTime(200) })
    rerender({ q: 're' })
    act(() => { vi.advanceTimersByTime(200) })
    // Total 400ms since first keystroke, but only 200ms since last — still debouncing
    expect(result.current).toBe('')

    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe('re')
  })
})
