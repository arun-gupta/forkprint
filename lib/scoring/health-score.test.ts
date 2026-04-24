import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import {
  WEIGHTS,
  getActivityRecommendations,
  getContributorsRecommendations,
  getHealthScore,
  getResponsivenessRecommendations,
} from './health-score'
import type { ActivityScoreDefinition } from '@/lib/activity/score-config'
import type { ResponsivenessScoreDefinition } from '@/lib/responsiveness/score-config'
import type { ContributorsScoreDefinition } from '@/lib/contributors/score-config'
import { buildResult } from '@/lib/testing/fixtures'

describe('health-score WEIGHTS constants', () => {
  // SC-002: The composite OSS Health Score weights must be unchanged after
  // the Community scoring feature (P2-F05 / #70). Community is a lens, not a
  // composite-weighted bucket. This test is a regression guard so any future
  // change to the composite weights is intentional and reviewed.
  it('matches the constitutionally-preserved composite weights', () => {
    expect(WEIGHTS).toEqual({
      activity: 0.25,
      responsiveness: 0.25,
      contributors: 0.23,
      documentation: 0.12,
      security: 0.15,
    })
  })

  it('composite weights sum to 1.00', () => {
    const total = WEIGHTS.activity + WEIGHTS.responsiveness + WEIGHTS.contributors
      + WEIGHTS.documentation + WEIGHTS.security
    expect(total).toBeCloseTo(1, 10)
  })
})

describe('health-score community-lens recommendations', () => {
  it('emits CTR-3 (file:funding) when hasFundingConfig is verifiably false', () => {
    const result = buildResult({ hasFundingConfig: false })
    const recs = getHealthScore(result).recommendations
    const funding = recs.find((r) => r.key === 'file:funding')
    expect(funding).toBeDefined()
    expect(funding?.bucket).toBe('Contributors')
    expect(funding?.tab).toBe('contributors')
    expect(funding?.message).toMatch(/FUNDING\.yml/i)
  })

  it('does NOT emit CTR-3 when hasFundingConfig is true', () => {
    const result = buildResult({ hasFundingConfig: true })
    const recs = getHealthScore(result).recommendations
    expect(recs.find((r) => r.key === 'file:funding')).toBeUndefined()
  })

  it('does NOT emit CTR-3 when hasFundingConfig is undefined (unknown state, never guess)', () => {
    const result = buildResult({})
    const recs = getHealthScore(result).recommendations
    expect(recs.find((r) => r.key === 'file:funding')).toBeUndefined()
  })

  it('emits ACT-5 (feature:discussions_enabled) when Discussions is verifiably disabled', () => {
    const result = buildResult({ hasDiscussionsEnabled: false })
    const recs = getHealthScore(result).recommendations
    const discussions = recs.find((r) => r.key === 'feature:discussions_enabled')
    expect(discussions).toBeDefined()
    expect(discussions?.bucket).toBe('Activity')
    expect(discussions?.tab).toBe('activity')
    expect(discussions?.message).toMatch(/GitHub Discussions/i)
  })

  it('does NOT emit ACT-5 when Discussions is enabled', () => {
    const result = buildResult({ hasDiscussionsEnabled: true })
    const recs = getHealthScore(result).recommendations
    expect(recs.find((r) => r.key === 'feature:discussions_enabled')).toBeUndefined()
  })

  it('does NOT emit ACT-5 when hasDiscussionsEnabled is undefined (unknown state)', () => {
    const result = buildResult({})
    const recs = getHealthScore(result).recommendations
    expect(recs.find((r) => r.key === 'feature:discussions_enabled')).toBeUndefined()
  })
})

describe('health-score sub-factor recommendation gate (#230)', () => {
  function makeActivity(factors: Record<string, number>): ActivityScoreDefinition {
    return {
      value: 50,
      tone: 'warning',
      description: '',
      summary: '',
      percentile: 50,
      bracketLabel: '',
      weightedFactors: Object.entries(factors).map(([label, percentile]) => ({
        label,
        weightLabel: '25%',
        description: '',
        percentile,
      })),
      missingInputs: [],
    }
  }

  function makeResponsiveness(cats: Record<string, number>): ResponsivenessScoreDefinition {
    return {
      value: 50,
      tone: 'warning',
      description: '',
      summary: '',
      percentile: 50,
      bracketLabel: '',
      weightedCategories: Object.entries(cats).map(([label, percentile]) => ({
        label,
        weightLabel: '33%',
        description: '',
        percentile,
      })),
      missingInputs: [],
    }
  }

  function makeContributors(factors: Record<string, number>): ContributorsScoreDefinition {
    return {
      value: 50,
      tone: 'warning',
      description: '',
      summary: '',
      percentile: 50,
      bracketLabel: '',
      concentration: 'unavailable',
      topContributorCount: 'unavailable',
      contributorCount: 'unavailable',
      weightedFactors: Object.entries(factors).map(([label, percentile]) => ({
        label,
        weightLabel: '20%',
        description: '',
        percentile,
      })),
      missingInputs: [],
    }
  }

  it('suppresses Activity sub-factor recommendations at/above the 50th percentile', () => {
    const keys = getActivityRecommendations(makeActivity({
      'PR flow': 95,
      'Issue flow': 30,
      'Completion speed': 50,
      'Sustained activity': 20,
    })).map((r) => r.key)
    expect(keys).not.toContain('pr_flow')
    expect(keys).toContain('issue_flow')
    expect(keys).not.toContain('completion_speed') // boundary: 50 suppressed
    expect(keys).toContain('sustained_activity')
  })

  it('suppresses Responsiveness sub-factor recommendations at/above the 50th percentile', () => {
    const keys = getResponsivenessRecommendations(makeResponsiveness({
      'Issue & PR response time': 90,
      'Resolution metrics': 49,
      'Volume & backlog health': 50,
    })).map((r) => r.key)
    expect(keys).not.toContain('response_time')
    expect(keys).toContain('resolution')
    expect(keys).not.toContain('backlog_health')
  })

  it('suppresses Contributors sub-factor recommendations at/above the 50th percentile', () => {
    const keys = getContributorsRecommendations(makeContributors({
      'Contributor concentration': 85,
      'Maintainer depth': 10,
      'Repeat-contributor ratio': 55,
      'New-contributor inflow': 49,
      'Contribution breadth': 50,
    })).map((r) => r.key)
    expect(keys).not.toContain('contributor_diversity')
    expect(keys).toContain('maintainer_depth')
    expect(keys).not.toContain('repeat_contributor_ratio')
    expect(keys).toContain('new_contributor_inflow')
    expect(keys).not.toContain('contribution_breadth')
  })

  it('still emits every recommendation when every sub-factor is below the gate', () => {
    const keys = getActivityRecommendations(makeActivity({
      'PR flow': 5,
      'Issue flow': 10,
      'Completion speed': 15,
      'Sustained activity': 20,
    })).map((r) => r.key)
    expect(keys).toEqual(expect.arrayContaining(['pr_flow', 'issue_flow', 'completion_speed', 'sustained_activity']))
  })

  it('suppresses Documentation and Security bucket recommendations when bucket percentile is at/above the gate', () => {
    // Build a result that scores Documentation above the gate. The
    // healthy-everywhere repo in the `popular` bracket has all files
    // present and a long README, which produces a high doc percentile.
    const docResult: AnalysisResult['documentationResult'] = {
      fileChecks: [
        { name: 'readme', found: true, path: 'README.md' },
        { name: 'license', found: true, path: 'LICENSE' },
        { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
        { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
        { name: 'security', found: true, path: 'SECURITY.md' },
        { name: 'governance', found: true, path: 'GOVERNANCE.md' },
        { name: 'changelog', found: true, path: 'CHANGELOG.md' },
        { name: 'issue_templates', found: true, path: '.github/ISSUE_TEMPLATE' },
        { name: 'pull_request_template', found: true, path: '.github/PULL_REQUEST_TEMPLATE.md' },
      ],
      readmeSections: [
        { name: 'description', detected: true },
        { name: 'installation', detected: true },
        { name: 'usage', detected: true },
        { name: 'contributing', detected: true },
        { name: 'license', detected: true },
      ],
      readmeContent: 'a'.repeat(5000),
    }

    const high = getHealthScore(buildResult({
      stars: 50000,
      totalContributors: 50,
      uniqueCommitAuthors90d: 30,
      maintainerCount: 5,
      documentationResult: docResult,
    }))
    // At/above gate: no per-file documentation recs emitted.
    expect(high.recommendations.find((r) => r.bucket === 'Documentation')).toBeUndefined()
  })
})

describe('health-score solo-project profile (#214)', () => {
  function buildSoloResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return buildResult({
      // Trips all 4 solo criteria
      totalContributors: 1,
      uniqueCommitAuthors90d: 1,
      maintainerCount: 'unavailable',
      documentationResult: 'unavailable',
      ...overrides,
    })
  }

  it('classifies a 1-contributor repo as solo profile', () => {
    const hs = getHealthScore(buildSoloResult())
    expect(hs.profile).toBe('solo')
    expect(hs.soloDetection.isSolo).toBe(true)
  })

  it('marks Contributors and Responsiveness buckets as hidden in solo mode', () => {
    const hs = getHealthScore(buildSoloResult())
    const contributors = hs.buckets.find((b) => b.name === 'Contributors')
    const responsiveness = hs.buckets.find((b) => b.name === 'Responsiveness')
    expect(contributors?.hidden).toBe(true)
    expect(responsiveness?.hidden).toBe(true)
  })

  it('applies SOLO_WEIGHTS to Activity, Security, Documentation buckets', () => {
    const hs = getHealthScore(buildSoloResult())
    expect(hs.buckets.find((b) => b.name === 'Activity')?.weight).toBeCloseTo(0.30, 10)
    expect(hs.buckets.find((b) => b.name === 'Security')?.weight).toBeCloseTo(0.35, 10)
    expect(hs.buckets.find((b) => b.name === 'Documentation')?.weight).toBeCloseTo(0.35, 10)
  })

  it('suppresses Contributors and Responsiveness recommendations in solo mode', () => {
    const hs = getHealthScore(buildSoloResult({ hasFundingConfig: false }))
    expect(hs.recommendations.find((r) => r.tab === 'contributors')).toBeUndefined()
    expect(hs.recommendations.find((r) => r.tab === 'responsiveness')).toBeUndefined()
    // FUNDING.yml recommendation is community-shaped; suppressed in solo
    expect(hs.recommendations.find((r) => r.key === 'file:funding')).toBeUndefined()
  })

  it('honors explicit mode: "community" override even when auto-detected solo', () => {
    const hs = getHealthScore(buildSoloResult(), { mode: 'community' })
    expect(hs.profile).toBe('community')
    expect(hs.buckets.find((b) => b.name === 'Contributors')?.hidden).toBeFalsy()
    expect(hs.buckets.find((b) => b.name === 'Activity')?.weight).toBeCloseTo(0.25, 10)
  })

  it('honors explicit mode: "solo" override even when not auto-detected', () => {
    const community = buildResult({ totalContributors: 50, uniqueCommitAuthors90d: 30, maintainerCount: 4 })
    const hs = getHealthScore(community, { mode: 'solo' })
    expect(hs.profile).toBe('solo')
    expect(hs.buckets.find((b) => b.name === 'Contributors')?.hidden).toBe(true)
  })

  it('community repos remain in community profile by default', () => {
    const hs = getHealthScore(buildResult({ totalContributors: 50, uniqueCommitAuthors90d: 20, maintainerCount: 3 }))
    expect(hs.profile).toBe('community')
  })
})
