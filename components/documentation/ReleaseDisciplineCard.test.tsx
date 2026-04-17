import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import { ReleaseDisciplineCard } from './ReleaseDisciplineCard'

function buildResult(rh: ReleaseHealthResult | 'unavailable' | undefined): AnalysisResult {
  return {
    repo: 'foo/bar',
    name: 'bar',
    description: '—',
    createdAt: '2024-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 10,
    watchers: 5,
    commits30d: 5,
    commits90d: 15,
    releases12mo: 2,
    prsOpened90d: 3,
    prsMerged90d: 2,
    issuesOpen: 4,
    issuesClosed90d: 3,
    uniqueCommitAuthors90d: 4,
    totalContributors: 10,
    maintainerCount: 2,
    commitCountsByAuthor: { 'login:alice': 5 },
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    releaseHealthResult: rh,
    missingFields: [],
  }
}

const noop = vi.fn()

describe('ReleaseDisciplineCard', () => {
  it('returns null when releaseHealthResult is undefined', () => {
    const { container } = render(
      <ReleaseDisciplineCard result={buildResult(undefined)} activeTag={null} onTagClick={noop} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders three release-health rows each carrying the pill', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 10,
      totalTags: 12,
      releaseFrequency: 4,
      daysSinceLastRelease: 30,
      semverComplianceRatio: 0.9,
      releaseNotesQualityRatio: 0.7,
      tagToReleaseRatio: 0.1,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    render(
      <ReleaseDisciplineCard result={buildResult(rh)} activeTag={null} onTagClick={noop} />,
    )
    expect(screen.getByText(/semver compliance/i)).toBeInTheDocument()
    expect(screen.getByText(/release notes quality/i)).toBeInTheDocument()
    expect(screen.getByText(/tag-to-release promotion/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /release-health/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "unavailable" for fields whose ratios cannot be computed', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 0,
      totalTags: 'unavailable',
      releaseFrequency: 'unavailable',
      daysSinceLastRelease: 'unavailable',
      semverComplianceRatio: 'unavailable',
      releaseNotesQualityRatio: 'unavailable',
      tagToReleaseRatio: 'unavailable',
      preReleaseRatio: 'unavailable',
      versioningScheme: 'unavailable',
    }
    render(
      <ReleaseDisciplineCard result={buildResult(rh)} activeTag={null} onTagClick={noop} />,
    )
    expect(screen.getAllByText(/unavailable/i).length).toBeGreaterThanOrEqual(3)
  })
})
