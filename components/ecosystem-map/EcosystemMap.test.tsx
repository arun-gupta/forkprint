import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EcosystemMap } from './EcosystemMap'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

describe('EcosystemMap', () => {
  it('renders visible stars, forks, and watchers for successful repositories', () => {
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
    const articles = within(region).getAllByRole('article')

    expect(within(articles[0]!).getByText('facebook/react')).toBeInTheDocument()
    expect(within(articles[0]!).getByText('Stars: 244,295')).toBeInTheDocument()
    expect(within(articles[0]!).getByText('Forks: 50,872')).toBeInTheDocument()
    expect(within(articles[0]!).getByText('Watchers: 6,660')).toBeInTheDocument()
  })

  it('shows unavailable ecosystem metrics explicitly', () => {
    render(
      <EcosystemMap
        results={[
          buildResult({
            stars: 'unavailable',
            forks: 50872,
            watchers: 'unavailable',
          }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })
    const articles = within(region).getAllByRole('article')

    expect(within(articles[0]!).getByText('Stars: unavailable')).toBeInTheDocument()
    expect(within(articles[0]!).getByText('Watchers: unavailable')).toBeInTheDocument()
    expect(
      within(region).getByText(/could not plot this repository because ecosystem metrics were incomplete/i),
    ).toBeInTheDocument()
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

  it('renders the ecosystem spectrum legend from config', () => {
    render(
      <EcosystemMap
        results={[
          buildResult({ repo: 'leader/repo', stars: 400, forks: 70, watchers: 40 }),
          buildResult({ repo: 'builder/repo', stars: 150, forks: 60, watchers: 18 }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })

    expect(within(region).getByText(/ecosystem spectrum/i)).toBeInTheDocument()
    expect(within(region).getByText(/^Reach bands$/)).toBeInTheDocument()
    expect(within(region).getAllByText(/^Builder engagement$/).length).toBeGreaterThan(0)
    expect(within(region).getAllByText(/^Attention$/).length).toBeGreaterThan(0)
  })

  it('shows a full spectrum profile even for a single repo', () => {
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

    expect(within(region).queryByText(/classification is skipped/i)).not.toBeInTheDocument()
    expect(within(region).getByText(/spectrum profile/i)).toBeInTheDocument()
    expect(within(region).getByText(/20.8% fork rate/i)).toBeInTheDocument()
    expect(within(region).getByText(/2.7% watcher rate/i)).toBeInTheDocument()
  })

  it('shows an exploratory spectrum preview with profile tiers', () => {
    render(
      <EcosystemMap
        results={[
          buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: /ecosystem map/i })

    expect(within(region).getByText(/35.2% fork rate/i)).toBeInTheDocument()
    expect(within(region).getByText(/2.6% watcher rate/i)).toBeInTheDocument()
    expect(within(region).getAllByText('Exceptional').length).toBeGreaterThan(0)
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
    commitCountsByAuthor: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
