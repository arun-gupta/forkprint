import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'
import { ReleaseCadenceCard } from './ReleaseCadenceCard'

function buildResult(rh: ReleaseHealthResult | 'unavailable' | undefined): AnalysisResult {
  return _buildResult({ releaseHealthResult: rh })
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
