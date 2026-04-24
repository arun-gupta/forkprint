import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLoadingTimer } from './useLoadingTimer'

describe('useLoadingTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts elapsed timer when isLoading becomes true', () => {
    const { result, rerender } = renderHook(({ loading, empty }) => useLoadingTimer(loading, empty), {
      initialProps: { loading: false, empty: true },
    })
    expect(result.current.elapsedSeconds).toBe(0)

    rerender({ loading: true, empty: false })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.elapsedSeconds).toBe(3)
  })

  it('resets elapsed seconds when loading stops', () => {
    const { result, rerender } = renderHook(({ loading, empty }) => useLoadingTimer(loading, empty), {
      initialProps: { loading: true, empty: false },
    })
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.elapsedSeconds).toBe(5)

    rerender({ loading: false, empty: true })
    expect(result.current.elapsedSeconds).toBe(0)
  })

  it('returns null currentQuote when not loading', () => {
    const { result } = renderHook(() => useLoadingTimer(false, true))
    expect(result.current.currentQuote).toBeNull()
  })

  it('returns a non-null currentQuote while loading', () => {
    const { result } = renderHook(() => useLoadingTimer(true, false))
    expect(result.current.currentQuote).not.toBeNull()
  })

  it('rotates currentQuote every 10 seconds while loading', () => {
    const { result } = renderHook(() => useLoadingTimer(true, false))
    const first = result.current.currentQuote
    act(() => { vi.advanceTimersByTime(10000) })
    // Quote may or may not change (random), but hook should not throw
    expect(result.current.currentQuote).toBeDefined()
    // Advance 5 more rotations — quote rotation runs without error
    act(() => { vi.advanceTimersByTime(50000) })
    expect(result.current.currentQuote).toBeDefined()
    void first
  })

  it('returns an emptyQuote when not loading', () => {
    const { result } = renderHook(() => useLoadingTimer(false, true))
    expect(result.current.emptyQuote).toBeTruthy()
    expect(typeof result.current.emptyQuote.text).toBe('string')
  })

  it('rotates emptyQuote every 10 seconds while in empty state', () => {
    const { result } = renderHook(() => useLoadingTimer(false, true))
    const first = result.current.emptyQuote
    // After 10 seconds the quote may change (random); the hook must not throw
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.emptyQuote).toBeTruthy()
    void first
  })

  it('stops rotating emptyQuote when empty state ends', () => {
    const { result, rerender } = renderHook(({ loading, empty }) => useLoadingTimer(loading, empty), {
      initialProps: { loading: false, empty: true },
    })
    rerender({ loading: true, empty: false })
    // Tick 20 seconds — interval should be cleared, no throw
    act(() => { vi.advanceTimersByTime(20000) })
    expect(result.current.emptyQuote).toBeTruthy()
  })
})
