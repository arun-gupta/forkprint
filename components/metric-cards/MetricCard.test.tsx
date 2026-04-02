import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildMetricCardViewModels } from '@/lib/metric-cards/view-model'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {
  it('renders summary metrics, ecosystem profile, and score badges', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    render(<MetricCard card={card} />)

    expect(screen.getByText('facebook/react')).toBeInTheDocument()
    expect(screen.getByText(/ecosystem profile/i)).toBeInTheDocument()
    expect(screen.getByText(/^Reach$/)).toBeInTheDocument()
    expect(screen.getByText(/^Engagement$/)).toBeInTheDocument()
    expect(screen.getByText(/^Attention$/)).toBeInTheDocument()
    expect(screen.getByText(/20.8% fork rate/i)).toBeInTheDocument()
    expect(screen.getByText(/2.7% watcher rate/i)).toBeInTheDocument()
    expect(screen.getByText('244,295')).toBeInTheDocument()
    expect(screen.getByText('50,872')).toBeInTheDocument()
    expect(screen.getByText('6,660')).toBeInTheDocument()
    expect(screen.getByText('Insufficient verified public data')).toBeInTheDocument()
    expect(screen.getAllByText('Not scored yet')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /missing data/i })).not.toBeInTheDocument()
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
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
