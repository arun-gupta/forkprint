import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { ContributorsView } from './ContributorsView'

describe('ContributorsView', () => {
  it('renders core and sustainability panes for each repository section', () => {
    render(<ContributorsView results={[buildResult()]} />)

    const region = screen.getByRole('region', { name: /contributors view/i })
    expect(within(region).getByText(/recent activity window/i)).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true')
    const corePane = within(region).getByRole('region', { name: /core contributors pane/i })
    expect(within(region).getByText('facebook/react')).toBeInTheDocument()
    expect(within(region).getByRole('heading', { name: /core/i })).toBeInTheDocument()
    expect(within(region).getByRole('heading', { name: /sustainability/i })).toBeInTheDocument()
    expect(within(corePane).getByText(/^Contribution heatmap$/i)).toBeInTheDocument()
    expect(within(region).queryByText(/later sustainability signals/i)).not.toBeInTheDocument()
  })

  it('lets the user include detected bot accounts in recent-commit metrics', async () => {
    render(
      <ContributorsView
        results={[
          buildResult({
            uniqueCommitAuthors90d: 4,
            commitCountsByAuthor: {
              'login:alice': 4,
              'login:dependabot[bot]': 3,
              'login:k8s-ci-robot': 2,
              'login:bob': 1,
            },
          }),
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: /include bots in heatmap/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/dependabot\[bot\] 3 commits/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /include bots in heatmap/i }))

    expect(screen.getByRole('button', { name: /exclude bots from heatmap/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/dependabot\[bot\] 3 commits/i)).toBeInTheDocument()
  })

  it('lets the user switch the contributor activity window locally', async () => {
    render(<ContributorsView results={[buildResult()]} />)

    await userEvent.click(screen.getByRole('button', { name: '30d' }))

    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/over the last 30 days/i)).toBeInTheDocument()
    expect(screen.getByText(/contributor metrics from verified public data for the last 30 days/i)).toBeInTheDocument()
  })
})

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'The library for web and native user interfaces.',
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
    uniqueCommitAuthors90d: 2,
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: {
      'login:alice': 2,
      'login:bob': 1,
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
