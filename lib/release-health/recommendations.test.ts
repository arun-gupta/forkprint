import { describe, expect, it } from 'vitest'
import type { AnalysisResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'
import { generateReleaseHealthRecommendations } from './recommendations'

function buildResult(rh: ReleaseHealthResult | 'unavailable' | undefined, overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({ releaseHealthResult: rh, ...overrides })
}

const GATE_OPEN = { activityPercentile: 30, documentationPercentile: 30 }
const GATE_CLOSED = { activityPercentile: 90, documentationPercentile: 90 }

describe('generateReleaseHealthRecommendations', () => {
  it('returns [] when releaseHealthResult is undefined', () => {
    const recs = generateReleaseHealthRecommendations(buildResult(undefined), GATE_OPEN)
    expect(recs).toEqual([])
  })

  it('recommends cutting a first release when never released but there are commits', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 0,
      totalTags: 0,
      releaseFrequency: 'unavailable',
      daysSinceLastRelease: 'unavailable',
      semverComplianceRatio: 'unavailable',
      releaseNotesQualityRatio: 'unavailable',
      tagToReleaseRatio: 0,
      preReleaseRatio: 'unavailable',
      versioningScheme: 'unavailable',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_OPEN)
    const keys = recs.map((r) => r.key)
    expect(keys).toContain('release_never_released')
  })

  it('fires stale rec only (not cooling / never) when last release > 24 months ago', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 5,
      totalTags: 5,
      releaseFrequency: 1,
      daysSinceLastRelease: 900,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_OPEN)
    const staleRecs = recs.filter((r) => r.key.startsWith('release_stale') || r.key.startsWith('release_cooling') || r.key === 'release_never_released')
    expect(staleRecs.length).toBe(1)
    expect(staleRecs[0]!.key).toBe('release_stale')
  })

  it('fires cooling rec when 365 <= days < 730 with recent commits', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 3,
      totalTags: 3,
      releaseFrequency: 1,
      daysSinceLastRelease: 400,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh, { commits90d: 20 }), GATE_OPEN)
    const keys = recs.map((r) => r.key)
    expect(keys).toContain('release_cooling')
    expect(keys).not.toContain('release_stale')
    expect(keys).not.toContain('release_never_released')
  })

  it('recommends adopting semver when compliance is low and no alternative scheme detected', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 10,
      totalTags: 10,
      releaseFrequency: 4,
      daysSinceLastRelease: 30,
      semverComplianceRatio: 0.1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'unrecognized',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_OPEN)
    const keys = recs.map((r) => r.key)
    // Versioning scheme is 'unrecognized' so the right rec is adopt_scheme, not adopt_semver (FR-029).
    expect(keys).toContain('release_adopt_scheme')
    expect(keys).not.toContain('release_adopt_semver')
  })

  it('suppresses the semver rec when CalVer is detected', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 10,
      totalTags: 10,
      releaseFrequency: 4,
      daysSinceLastRelease: 30,
      semverComplianceRatio: 0.0,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'calver',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_OPEN)
    const keys = recs.map((r) => r.key)
    expect(keys).not.toContain('release_adopt_semver')
    expect(keys).not.toContain('release_adopt_scheme')
  })

  it('recommends improving release notes when ratio is below the floor (not only on empty)', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 10,
      totalTags: 10,
      releaseFrequency: 4,
      daysSinceLastRelease: 30,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 0.3,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_OPEN)
    expect(recs.map((r) => r.key)).toContain('release_improve_notes')
  })

  it('recommends promoting tags when many tags are not released', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 5,
      totalTags: 20,
      releaseFrequency: 3,
      daysSinceLastRelease: 30,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0.75,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_OPEN)
    expect(recs.map((r) => r.key)).toContain('release_promote_tags')
  })

  it('never fires a recommendation on preReleaseRatio alone', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 5,
      totalTags: 5,
      releaseFrequency: 3,
      daysSinceLastRelease: 30,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 1,
      tagToReleaseRatio: 0,
      preReleaseRatio: 1,
      versioningScheme: 'semver',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_OPEN)
    const keys = recs.map((r) => r.key)
    for (const k of keys) {
      expect(k).not.toMatch(/prerelease/i)
    }
  })

  it('suppresses all release-health recs when host bucket percentiles clear the gate', () => {
    const rh: ReleaseHealthResult = {
      totalReleasesAnalyzed: 0,
      totalTags: 0,
      releaseFrequency: 'unavailable',
      daysSinceLastRelease: 'unavailable',
      semverComplianceRatio: 'unavailable',
      releaseNotesQualityRatio: 'unavailable',
      tagToReleaseRatio: 0,
      preReleaseRatio: 'unavailable',
      versioningScheme: 'unavailable',
    }
    const recs = generateReleaseHealthRecommendations(buildResult(rh), GATE_CLOSED)
    expect(recs).toEqual([])
  })
})
