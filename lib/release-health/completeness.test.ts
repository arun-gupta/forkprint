import { describe, expect, it } from 'vitest'
import type { AnalysisResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'
import { computeReleaseHealthCompleteness } from './completeness'

function buildResult(rh: ReleaseHealthResult | 'unavailable' | undefined): AnalysisResult {
  return _buildResult({ releaseHealthResult: rh })
}

describe('computeReleaseHealthCompleteness', () => {
  it('returns null ratio / percentile when releaseHealthResult is unavailable', () => {
    const c = computeReleaseHealthCompleteness(buildResult('unavailable'))
    expect(c.ratio).toBeNull()
    expect(c.percentile).toBeNull()
    expect(c.tone).toBe('neutral')
  })

  it('returns null ratio when releaseHealthResult is undefined (pre-feature fixture)', () => {
    const c = computeReleaseHealthCompleteness(buildResult(undefined))
    expect(c.ratio).toBeNull()
    expect(c.percentile).toBeNull()
  })

  it('marks all five signals as present and returns ratio 1 when the repo is fully release-healthy', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 12,
      totalTags: 12,
      releaseFrequency: 6,
      daysSinceLastRelease: 10,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    const c = computeReleaseHealthCompleteness(buildResult(rh))
    expect(c.present.length).toBe(5)
    expect(c.missing.length).toBe(0)
    expect(c.unknown.length).toBe(0)
    expect(c.ratio).toBe(1)
    expect(c.percentile).toBe(99)
  })

  it('excludes unknown signals from numerator and denominator (FR-021)', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 2,
      totalTags: 'unavailable',
      releaseFrequency: 2,
      daysSinceLastRelease: 5,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 'unavailable',
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    const c = computeReleaseHealthCompleteness(buildResult(rh))
    expect(c.unknown).toContain('tag_to_release')
    expect(c.present.length + c.missing.length).toBe(4)
    expect(c.ratio).toBeCloseTo(1, 5)
  })

  it('classifies a moderate posture into the middle of the ratio range', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 4,
      totalTags: 10,
      releaseFrequency: 2,
      daysSinceLastRelease: 120,
      semverComplianceRatio: 0.5,
      releaseNotesQualityRatio: 0.4,
      tagToReleaseRatio: 0.6,
      preReleaseRatio: 0.25,
      versioningScheme: 'semver',
    }
    const c = computeReleaseHealthCompleteness(buildResult(rh))
    expect(c.ratio).not.toBeNull()
    expect(c.ratio).toBeGreaterThan(0)
    expect(c.ratio).toBeLessThan(1)
  })

  it('marks everything as unknown when the analyzer emitted an object with all per-field unavailable', () => {
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
    const c = computeReleaseHealthCompleteness(buildResult(rh))
    expect(c.ratio).toBeNull()
    expect(c.percentile).toBeNull()
    expect(c.unknown.length).toBe(5)
  })
})
