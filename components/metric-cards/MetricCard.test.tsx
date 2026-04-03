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
    expect(screen.getAllByText('High')).toHaveLength(2)
    expect(screen.getByText('Insufficient verified public data')).toBeInTheDocument()
    expect(screen.queryByText('Not scored yet')).not.toBeInTheDocument()
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
    releases12mo: 6,
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    responsivenessMetrics: {
      issueFirstResponseMedianHours: 4,
      issueFirstResponseP90Hours: 20,
      prFirstReviewMedianHours: 8,
      prFirstReviewP90Hours: 24,
      issueResolutionMedianHours: 48,
      issueResolutionP90Hours: 120,
      prMergeMedianHours: 36,
      prMergeP90Hours: 96,
      issueResolutionRate: 0.92,
      contributorResponseRate: 0.88,
      botResponseRatio: 0.1,
      humanResponseRatio: 0.9,
      staleIssueRatio: 0.12,
      stalePrRatio: 0.08,
      prReviewDepth: 2.4,
      issuesClosedWithoutCommentRatio: 0.08,
      openIssueCount: 22,
      openPullRequestCount: 11,
    },
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
