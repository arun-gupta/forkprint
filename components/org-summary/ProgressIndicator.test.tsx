import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ProgressIndicator } from './ProgressIndicator'

describe('ProgressIndicator', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  const baseProps = {
    succeeded: 3,
    failed: 1,
    total: 10,
    status: 'in-progress' as const,
    startedAt: new Date('2026-01-01T00:00:00Z'),
    etaMs: 60_000,
  }

  it('renders a progress bar with correct percentage', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('shows repo count text', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} />)
    expect(screen.getByText(/4 of 10 repos/)).toBeInTheDocument()
  })

  it('shows elapsed time', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} />)
    expect(screen.getByText(/Elapsed: 1m 0s/)).toBeInTheDocument()
  })

  it('shows ETA when in progress', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} />)
    expect(screen.getByText(/ETA: 1m 0s/)).toBeInTheDocument()
  })

  it('updates elapsed timer as time progresses', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    vi.setSystemTime(start)
    render(<ProgressIndicator {...baseProps} startedAt={start} />)
    expect(screen.getByText(/Elapsed: 0s/)).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByText(/Elapsed: 2s/)).toBeInTheDocument()
  })

  it('renders a rotating quote when in-progress', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    render(<ProgressIndicator {...baseProps} />)
    const blockquote = document.querySelector('blockquote')
    expect(blockquote).not.toBeNull()
    expect(blockquote?.textContent).toBeTruthy()
  })

  it('stops rotation and hides quote on terminal completion', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} status="complete" succeeded={10} failed={0} />)
    expect(document.querySelector('blockquote')).toBeNull()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('shows cancelled state', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} status="cancelled" />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(document.querySelector('blockquote')).toBeNull()
  })

  it('shows failure count on complete with failures', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} status="complete" succeeded={8} failed={2} total={10} />)
    expect(screen.getByText(/Done — 2 failed/)).toBeInTheDocument()
  })

  it('hides ETA on terminal status', () => {
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'))
    render(<ProgressIndicator {...baseProps} status="complete" succeeded={10} failed={0} />)
    expect(screen.queryByText(/ETA:/)).not.toBeInTheDocument()
  })
})
