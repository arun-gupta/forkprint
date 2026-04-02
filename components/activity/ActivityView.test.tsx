import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ActivityView } from './ActivityView'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'A UI library',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 25,
    watchers: 10,
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
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6 },
    },
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}

describe('ActivityView', () => {
  it('renders one activity section per successful repository with visible primary values', () => {
    render(<ActivityView results={[buildResult(), buildResult({ repo: 'vercel/next.js', commits30d: 42 })]} />)

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText('facebook/react')).toBeInTheDocument()
    expect(within(activityView).getByText('vercel/next.js')).toBeInTheDocument()
    expect(within(activityView).getAllByText(/commits \(90d\)/i)).toHaveLength(2)
    expect(within(activityView).getAllByText('18')).toHaveLength(2)
  })

  it('renders explicit unavailable values instead of hiding them', () => {
    render(
      <ActivityView
        results={[
          buildResult({
            activityMetricsByWindow: {
              30: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable' },
              60: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable' },
              90: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable' },
              180: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable' },
              365: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable' },
            },
          }),
        ]}
      />
    )

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText(/releases \(90d\)/i)).toBeInTheDocument()
    expect(within(activityView).getAllByText('unavailable').length).toBeGreaterThan(0)
  })

  it('switches the recent activity window locally', async () => {
    render(<ActivityView results={[buildResult()]} />)

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText(/commits \(90d\)/i)).toBeInTheDocument()
    expect(within(activityView).getByText('18')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '30d' }))

    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(activityView).getByText(/commits \(30d\)/i)).toBeInTheDocument()
    expect(within(activityView).getByText('7')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '12 months' }))

    expect(screen.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(activityView).getByText(/releases \(12mo\)/i)).toBeInTheDocument()
    expect(within(activityView).getByText('6')).toBeInTheDocument()
  })
})
