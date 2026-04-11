import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultsTabs } from './ResultsTabs'
import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'

const tabs: ResultTabDefinition[] = [
  { id: 'overview', label: 'Overview', status: 'implemented', description: 'Overview content' },
  { id: 'contributors', label: 'Contributors', status: 'placeholder', description: 'Contributors content' },
  { id: 'activity', label: 'Activity', status: 'placeholder', description: 'Activity content' },
]

describe('ResultsTabs', () => {
  it('renders the active tab and allows switching without side effects', async () => {
    const onChange = vi.fn()

    render(<ResultsTabs tabs={tabs} activeTab="overview" onChange={onChange} />)

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('tab', { name: 'Contributors' }))

    expect(onChange).toHaveBeenCalledWith('contributors')
  })

  it('renders Activity as a top-level tab label', () => {
    render(<ResultsTabs tabs={tabs} activeTab="overview" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Health Ratios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Metrics' })).not.toBeInTheDocument()
  })
})
