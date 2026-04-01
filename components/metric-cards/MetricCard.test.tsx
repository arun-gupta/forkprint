import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildMetricCardViewModels } from '@/lib/metric-cards/view-model'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {
  it('renders summary metrics, ecosystem profile, and score badges', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    render(<MetricCard card={card} expanded={false} onToggle={vi.fn()} />)

    expect(screen.getByText('facebook/react')).toBeInTheDocument()
    expect(screen.getByText('244,295')).toBeInTheDocument()
    expect(screen.getByText('50,872')).toBeInTheDocument()
    expect(screen.getByText('6,660')).toBeInTheDocument()
    expect(screen.getByText(/ecosystem profile summary/i)).toBeInTheDocument()
    expect(screen.getByText(/Builder Engagement/i)).toBeInTheDocument()
    expect(screen.getAllByText('Not scored yet')).toHaveLength(3)
  })

  it('reveals full metric detail when expanded', async () => {
    const card = buildMetricCardViewModels([buildResult({ missingFields: ['releases12mo'] })])[0]!
    const onToggle = vi.fn()

    const { rerender } = render(<MetricCard card={card} expanded={false} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /show details/i }))
    expect(onToggle).toHaveBeenCalled()

    rerender(<MetricCard card={card} expanded onToggle={onToggle} />)

    const detailRegion = screen.getByText(/full metric detail/i).closest('div')
    expect(within(detailRegion!).getByText('Primary language')).toBeInTheDocument()
    expect(within(detailRegion!).getByText('TypeScript')).toBeInTheDocument()
    expect(within(detailRegion!).getByText(/releases12mo/i)).toBeInTheDocument()
  })
})

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'The library for web and native user interfaces.',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: 244295,
    forks: 50872,
    watchers: 6660,
    commits30d: 7,
    commits90d: 18,
    releases12mo: 'unavailable',
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
