import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { MetricCardsOverview } from './MetricCardsOverview'

describe('MetricCardsOverview', () => {
  it('renders one card per successful repository', () => {
    render(<MetricCardsOverview results={[buildResult({ repo: 'facebook/react' }), buildResult({ repo: 'kubernetes/kubernetes' })]} />)

    expect(screen.getByTestId('metric-card-facebook/react')).toBeInTheDocument()
    expect(screen.getByTestId('metric-card-kubernetes/kubernetes')).toBeInTheDocument()
  })

  it('manages expansion state locally', async () => {
    render(<MetricCardsOverview results={[buildResult()]} />)

    expect(screen.queryByText(/full metric detail/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /show details/i }))
    expect(screen.getByText(/full metric detail/i)).toBeInTheDocument()
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
