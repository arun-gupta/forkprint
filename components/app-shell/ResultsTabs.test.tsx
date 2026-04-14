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

  it('renders badge counts when matchCounts prop is provided', () => {
    const matchCounts = { overview: 3, activity: 5, security: 0 }
    render(<ResultsTabs tabs={tabs} activeTab="overview" onChange={vi.fn()} matchCounts={matchCounts} />)

    // Overview should show (3)
    const overviewTab = screen.getByRole('tab', { name: /Overview/ })
    expect(overviewTab.textContent).toContain('3')

    // Activity should show (5)
    const activityTab = screen.getByRole('tab', { name: /Activity/ })
    expect(activityTab.textContent).toContain('5')

    // Contributors has no count in matchCounts, so no badge
    const contributorsTab = screen.getByRole('tab', { name: /Contributors/ })
    expect(contributorsTab.textContent).toBe('Contributors')
  })

  it('does not render badges when matchCounts is not provided', () => {
    render(<ResultsTabs tabs={tabs} activeTab="overview" onChange={vi.fn()} />)

    const overviewTab = screen.getByRole('tab', { name: /Overview/ })
    expect(overviewTab.textContent).toBe('Overview')
  })

  it('shows overflow tabs in a More menu and supports Show all', async () => {
    const manyTabs: ResultTabDefinition[] = [
      { id: 'overview', label: 'Overview', status: 'implemented', description: '' },
      { id: 'contributors', label: 'Contributors', status: 'placeholder', description: '' },
      { id: 'activity', label: 'Activity', status: 'placeholder', description: '' },
      { id: 'responsiveness', label: 'Responsiveness', status: 'implemented', description: '' },
      { id: 'documentation', label: 'Documentation', status: 'implemented', description: '' },
      { id: 'security', label: 'Security', status: 'implemented', description: '' },
      { id: 'recommendations', label: 'Recommendations', status: 'implemented', description: '' },
      { id: 'comparison', label: 'Comparison', status: 'implemented', description: '' },
    ]
    const onChange = vi.fn()

    render(<ResultsTabs tabs={manyTabs} activeTab="overview" onChange={onChange} />)

    // First 6 tabs are visible directly
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Security' })).toBeInTheDocument()

    // Overflow tabs are hidden until More is clicked
    expect(screen.queryByRole('tab', { name: 'Recommendations' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Comparison' })).not.toBeInTheDocument()

    // Open dropdown and select a tab
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(screen.getByRole('tab', { name: 'Recommendations' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Comparison' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Comparison' }))
    expect(onChange).toHaveBeenCalledWith('comparison')

    // Open dropdown again and click Show all — all tabs become inline
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    await userEvent.click(screen.getByRole('button', { name: /Show all/ }))

    // Now all 8 tabs are visible as inline tab buttons with a Show less button
    expect(screen.getAllByRole('tab')).toHaveLength(8)
    expect(screen.queryByRole('button', { name: /More/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Show less/ })).toBeInTheDocument()

    // Click Show less — collapses back to 6 tabs + More dropdown
    await userEvent.click(screen.getByRole('button', { name: /Show less/ }))
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(screen.getByRole('button', { name: /More/ })).toBeInTheDocument()
  })
})
