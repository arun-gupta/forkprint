import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { RateLimitPausePanel } from './RateLimitPausePanel'

describe('RateLimitPausePanel', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('renders with primary rate-limit kind', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    render(<RateLimitPausePanel kind="primary" resumesAt={new Date('2026-01-01T00:01:00Z')} reposToReDispatch={5} pausesSoFar={1} />)
    expect(screen.getByText(/primary limit hit/i)).toBeInTheDocument()
    expect(screen.getByText(/5 repos to re-dispatch/)).toBeInTheDocument()
    expect(screen.getByText(/Pauses so far: 1/)).toBeInTheDocument()
  })

  it('renders with secondary rate-limit kind', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    render(<RateLimitPausePanel kind="secondary" resumesAt={new Date('2026-01-01T00:01:00Z')} reposToReDispatch={3} pausesSoFar={2} />)
    expect(screen.getByText(/secondary limit hit/i)).toBeInTheDocument()
  })

  it('shows a live countdown', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    render(<RateLimitPausePanel kind="primary" resumesAt={new Date('2026-01-01T00:01:00Z')} reposToReDispatch={5} pausesSoFar={1} />)
    expect(screen.getByTestId('countdown').textContent).toBe('1m 0s')
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(screen.getByTestId('countdown').textContent).toBe('30s')
  })

  it('shows cancel button when onCancel is provided', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const onCancel = vi.fn()
    render(<RateLimitPausePanel kind="primary" resumesAt={new Date('2026-01-01T00:01:00Z')} reposToReDispatch={5} pausesSoFar={1} onCancel={onCancel} />)
    screen.getByText('Cancel run').click()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('hides cancel button when onCancel is not provided', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    render(<RateLimitPausePanel kind="primary" resumesAt={new Date('2026-01-01T00:01:00Z')} reposToReDispatch={5} pausesSoFar={1} />)
    expect(screen.queryByText('Cancel run')).not.toBeInTheDocument()
  })

  it('has aria-label for accessibility', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    render(<RateLimitPausePanel kind="primary" resumesAt={new Date('2026-01-01T00:01:00Z')} reposToReDispatch={5} pausesSoFar={1} />)
    expect(screen.getByLabelText('Rate limit pause')).toBeInTheDocument()
  })
})
