import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildHealthRatioRows, buildContributorRatioMetricRows, sortHealthRatioCells } from './view-model'

describe('health-ratios/view-model', () => {
  it('builds grouped ratio rows from verified result inputs', () => {
    const rows = buildHealthRatioRows([buildResult()])

    expect(rows.find((row) => row.id === 'fork-rate')?.cells[0]?.displayValue).toMatch(/25\.0% \(\d+\w{2} percentile\)/)
    expect(rows.find((row) => row.id === 'pr-merge-rate')?.cells[0]?.displayValue).toMatch(/75\.0% \(\d+\w{2} percentile\)/)
    expect(rows.find((row) => row.id === 'repeat-contributor-ratio')?.cells[0]?.displayValue).toMatch(/25\.0% \(\d+\w{2} percentile\)/)
    expect(rows.find((row) => row.id === 'new-contributor-ratio')?.cells[0]?.displayValue).toMatch(/16\.7% \(\d+\w{2} percentile\)/)
  })

  it('sorts unavailable values after numeric values', () => {
    const sorted = sortHealthRatioCells(
      [
        { repo: 'z/repo', value: 'unavailable', displayValue: '—' },
        { repo: 'a/repo', value: 0.2, displayValue: '20.0%' },
        { repo: 'b/repo', value: 0.8, displayValue: '80.0%' },
      ],
      'desc',
    )

    expect(sorted.map((cell) => cell.repo)).toEqual(['b/repo', 'a/repo', 'z/repo'])
  })

  it('builds contributor home-view ratio rows with visible labels and help text', () => {
    const rows = buildContributorRatioMetricRows(buildResult(), {
      repeatContributors: 3,
      newContributors: 2,
    })

    expect(rows[0]?.label).toBe('Repeat contributor ratio')
    expect(rows[0]?.value).toMatch(/25\.0%/)
    expect(rows[1]?.label).toBe('New contributor ratio')
    expect(rows[1]?.value).toMatch(/16\.7%/)
    expect(rows[1]?.hoverText).toMatch(/available 365-day history/i)
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
      30: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      60: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      90: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      180: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
      365: {
        uniqueCommitAuthors: 5,
        commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
        repeatContributors: 3,
        newContributors: 2,
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
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
