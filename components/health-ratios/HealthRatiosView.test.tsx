import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { HealthRatiosView } from './HealthRatiosView'

describe('HealthRatiosView', () => {
  it('renders grouped category sections with verified ratio columns', () => {
    render(<HealthRatiosView results={[buildResult('facebook/react')]} />)

    const region = screen.getByRole('region', { name: /health ratios view/i })
    const headings = within(region).getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Overview', 'Contributors', 'Activity'])
    expect(within(region).getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(within(region).getByRole('heading', { name: 'Activity' })).toBeInTheDocument()
    expect(within(region).getByRole('heading', { name: 'Contributors' })).toBeInTheDocument()
    expect(within(region).getByText('Fork rate')).toBeInTheDocument()
    expect(within(region).getByText('Repeat contributor ratio')).toBeInTheDocument()
    expect(within(region).getAllByText('25.0%').length).toBeGreaterThan(0)
    expect(within(region).getByText('75.0% · Strong')).toBeInTheDocument()
  })

  it('sorts repository rows by the selected ratio column', async () => {
    render(<HealthRatiosView results={[buildResult('facebook/react', { forks: 25 }), buildResult('vercel/next.js', { forks: 10 })]} />)

    const overviewSection = screen.getByRole('heading', { name: 'Overview' }).closest('section')
    expect(overviewSection).not.toBeNull()

    const beforeSortRows = within((overviewSection as HTMLElement).querySelector('tbody') as HTMLElement).getAllByRole('row')
    expect(beforeSortRows[0]).toHaveTextContent('facebook/react')
    expect(beforeSortRows[1]).toHaveTextContent('vercel/next.js')

    await userEvent.click(within(overviewSection as HTMLElement).getByRole('button', { name: /fork rate/i }))

    const afterSortRows = within((overviewSection as HTMLElement).querySelector('tbody') as HTMLElement).getAllByRole('row')
    expect(afterSortRows[0]).toHaveTextContent('vercel/next.js')
    expect(afterSortRows[1]).toHaveTextContent('facebook/react')
  })

  it('renders unavailable values as a muted em dash', () => {
    const { container } = render(<HealthRatiosView results={[buildResult('facebook/react', { totalContributors: 'unavailable' })]} />)

    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    const mutedDashCells = Array.from(container.querySelectorAll('td')).filter(
      (td) => td.textContent?.trim() === '—' && td.className.includes('text-slate-400'),
    )
    expect(mutedDashCells.length).toBeGreaterThan(0)
  })
})

function buildResult(repo: string, overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo,
    name: repo.split('/')[1] ?? repo,
    description: 'Repo description',
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
    uniqueCommitAuthors90d: 5,
    totalContributors: 12,
    maintainerCount: 'unavailable',
    commitCountsByAuthor: {
      'login:alice': 4,
      'login:bob': 3,
      'login:carol': 2,
      'login:dave': 1,
      'login:erin': 1,
    },
    contributorMetricsByWindow: {
      30: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      60: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      90: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      180: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      365: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    },
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
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
