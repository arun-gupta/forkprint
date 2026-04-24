import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'
import { ReleaseDisciplineCard } from './ReleaseDisciplineCard'

function buildResult(rh: ReleaseHealthResult | 'unavailable' | undefined): AnalysisResult {
  return _buildResult({ releaseHealthResult: rh })
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
