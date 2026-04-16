import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PerRepoStatusEntry } from '@/lib/org-aggregation/types'
import { PerRepoStatusList } from './PerRepoStatusList'

function entries(): PerRepoStatusEntry[] {
  return [
    { repo: 'o/alpha', status: 'done', badge: 'done', isFlagship: false },
    { repo: 'o/bravo', status: 'failed', badge: 'failed', isFlagship: false, errorReason: 'insufficient scope' },
    { repo: 'o/charlie', status: 'failed', badge: 'failed', isFlagship: false, errorReason: 'rate limited' },
    { repo: 'o/delta', status: 'in-progress', badge: 'in-progress', isFlagship: false },
  ]
}

describe('PerRepoStatusList bulk retry', () => {
  it('renders a "Retry all failed (N)" button counting failed rows', () => {
    render(<PerRepoStatusList entries={entries()} onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: /Retry all failed \(2\)/ })).toBeInTheDocument()
  })

  it('calls onRetry once per failed repo when bulk button is clicked', () => {
    const onRetry = vi.fn()
    render(<PerRepoStatusList entries={entries()} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /Retry all failed/ }))
    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledWith('o/bravo')
    expect(onRetry).toHaveBeenCalledWith('o/charlie')
  })

  it('hides the bulk button when nothing has failed', () => {
    const noFailures = entries().filter((e) => e.status !== 'failed')
    render(<PerRepoStatusList entries={noFailures} onRetry={() => {}} />)
    expect(screen.queryByRole('button', { name: /Retry all failed/ })).not.toBeInTheDocument()
  })

  it('hides the bulk button when onRetry is not provided', () => {
    render(<PerRepoStatusList entries={entries()} />)
    expect(screen.queryByRole('button', { name: /Retry all failed/ })).not.toBeInTheDocument()
  })

  it('shows per-row errorReason and per-row Retry for failed rows', () => {
    render(<PerRepoStatusList entries={entries()} onRetry={() => {}} />)
    expect(screen.getByText('insufficient scope')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry o/bravo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry o/charlie' })).toBeInTheDocument()
  })
})
