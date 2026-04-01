import { vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EcosystemMap } from './EcosystemMap'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

vi.mock('react-chartjs-2', () => ({
  Bubble: () => <div data-testid="bubble-chart-canvas" />,
}))

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

    expect(within(region).getByText('facebook/react')).toBeInTheDocument()
    expect(within(region).getByText('Stars: 244,295')).toBeInTheDocument()
    expect(within(region).getByText('Forks: 50,872')).toBeInTheDocument()
    expect(within(region).getByText('Watchers: 6,660')).toBeInTheDocument()
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

    expect(within(region).getByText('Stars: unavailable')).toBeInTheDocument()
    expect(within(region).getByText('Watchers: unavailable')).toBeInTheDocument()
    expect(
      within(region).getByText(/could not plot this repository because ecosystem metrics were incomplete/i),
    ).toBeInTheDocument()
  })

  it('renders a bubble chart summary for plot-eligible repositories', () => {
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

    const chart = screen.getByRole('img', { name: /ecosystem bubble chart/i })
    expect(chart).toBeInTheDocument()
    expect(within(chart).getByTestId('bubble-chart-canvas')).toBeInTheDocument()
    expect(screen.getByText(/stars \(x-axis\)/i)).toBeInTheDocument()
    expect(screen.getByText(/forks \(y-axis\)/i)).toBeInTheDocument()
    expect(screen.getByText(/watchers \(bubble size\)/i)).toBeInTheDocument()
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
