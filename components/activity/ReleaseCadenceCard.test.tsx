import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import { ReleaseCadenceCard } from './ReleaseCadenceCard'

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

describe('ReleaseCadenceCard', () => {
  it('returns null when releaseHealthResult is undefined', () => {
    const { container } = render(
      <ReleaseCadenceCard result={buildResult(undefined)} activeTag={null} onTagClick={noop} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders with unavailable fields when releaseHealthResult is "unavailable"', () => {
    render(
      <ReleaseCadenceCard result={buildResult('unavailable')} activeTag={null} onTagClick={noop} />,
    )
    expect(screen.getByText(/^release cadence$/i)).toBeInTheDocument()
    // Three "unavailable" placeholders
    expect(screen.getAllByText(/^unavailable$/i).length).toBe(3)
  })

  it('renders frequency, recency, and pre-release state when populated', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 12,
      totalTags: 12,
      releaseFrequency: 6,
      daysSinceLastRelease: 10,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0.25,
      versioningScheme: 'semver',
    }
    render(
      <ReleaseCadenceCard result={buildResult(rh)} activeTag={null} onTagClick={noop} />,
    )
    expect(screen.getByText(/6 per year/i)).toBeInTheDocument()
    expect(screen.getByText(/10 days ago/i)).toBeInTheDocument()
    expect(screen.getByText(/25%/i)).toBeInTheDocument()
  })

  it('carries the release-health tag pill', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 1,
      totalTags: 1,
      releaseFrequency: 'unavailable',
      daysSinceLastRelease: 3,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    render(
      <ReleaseCadenceCard result={buildResult(rh)} activeTag={null} onTagClick={noop} />,
    )
    expect(screen.getByRole('button', { name: /release-health/i })).toBeInTheDocument()
  })
})
