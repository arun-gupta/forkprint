import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EcosystemMap } from './EcosystemMap'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

describe('EcosystemMap', () => {
  it('renders the shared ecosystem spectrum guidance for successful repositories', () => {
    render(
      <EcosystemMap
        results={[
          buildResult({
            repo: 'facebook/react',
            stars: 244295,
            forks: 50872,
            watchers: 6660,
          }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })
    expect(within(region).getByText(/ecosystem spectrum/i)).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: /show legend/i })).toBeInTheDocument()
    expect(within(region).queryByText(/^Reach$/)).not.toBeInTheDocument()
  })

  it('does not duplicate per-repo spectrum profile content', () => {
    render(
      <EcosystemMap
        results={[
          buildResult({
            repo: 'facebook/react',
            stars: 244295,
            forks: 50872,
            watchers: 6660,
          }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })
    expect(within(region).queryByText('facebook/react')).not.toBeInTheDocument()
    expect(within(region).queryByText(/spectrum profile/i)).not.toBeInTheDocument()
  })

  it('renders the spectrum-only view without the chart', () => {
    render(
      <EcosystemMap
        results={[
          buildResult({
            repo: 'facebook/react',
            stars: 244295,
            forks: 50872,
            watchers: 6660,
          }),
          buildResult({
            repo: 'vercel/next.js',
            stars: 132000,
            forks: 28700,
            watchers: 2400,
          }),
        ]}
      />,
    )

    expect(screen.queryByRole('img', { name: /ecosystem bubble chart/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reset zoom/i })).not.toBeInTheDocument()
    expect(screen.getByText(/ecosystem spectrum/i)).toBeInTheDocument()
  })

  it('renders the ecosystem spectrum legend from config when expanded', async () => {
    render(
      <EcosystemMap
        results={[
          buildResult({ repo: 'leader/repo', stars: 400, forks: 70, watchers: 40 }),
          buildResult({ repo: 'builder/repo', stars: 150, forks: 60, watchers: 18 }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })
    await userEvent.click(within(region).getByRole('button', { name: /show legend/i }))

    expect(within(region).getByText(/ecosystem spectrum/i)).toBeInTheDocument()
    expect(within(region).getByText(/^Reach$/)).toBeInTheDocument()
    expect(within(region).getAllByText(/^Builder engagement$/).length).toBeGreaterThan(0)
    expect(within(region).getAllByText(/^Attention$/).length).toBeGreaterThan(0)
  })

  it('shows band guidance without per-repo rate pills for a single repo', async () => {
    render(
      <EcosystemMap
        results={[
          buildResult({
            repo: 'facebook/react',
            stars: 244295,
            forks: 50872,
            watchers: 6660,
          }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })
    await userEvent.click(within(region).getByRole('button', { name: /show legend/i }))

    expect(within(region).queryByText(/20.8% fork rate/i)).not.toBeInTheDocument()
    expect(within(region).queryByText(/2.7% watcher rate/i)).not.toBeInTheDocument()
    expect(within(region).getByText(/^Builder engagement$/)).toBeInTheDocument()
    expect(within(region).getByText(/^fork rate$/i)).toBeInTheDocument()
  })

  it('shows band tiers in the legend', async () => {
    render(
      <EcosystemMap
        results={[
          buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })
    await userEvent.click(within(region).getByRole('button', { name: /show legend/i }))

    expect(within(region).getByText(/Exceptional 100k\+/i)).toBeInTheDocument()
    expect(within(region).getByText(/Exceptional 31\.1%\+/i)).toBeInTheDocument()
    expect(within(region).getByText(/Exceptional 2\.5%\+/i)).toBeInTheDocument()
  })

  it('hides the legend rows again after collapsing', async () => {
    render(
      <EcosystemMap
        results={[
          buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })
    await userEvent.click(within(region).getByRole('button', { name: /show legend/i }))
    expect(within(region).getByText(/^Reach$/)).toBeInTheDocument()

    await userEvent.click(within(region).getByRole('button', { name: /hide legend/i }))
    expect(within(region).queryByText(/^Reach$/)).not.toBeInTheDocument()
  })
})

function buildResult(overrides: Partial<AnalysisResult>): AnalysisResult {
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
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
