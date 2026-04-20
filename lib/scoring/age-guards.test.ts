import { describe, it, expect } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getContributorsScore } from '@/lib/contributors/score-config'
import { getActivityScore } from '@/lib/activity/score-config'
import { MATURITY_CONFIG } from './config-loader'

function baseResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  const base = {
    repo: 'owner/repo',
    name: 'repo',
    description: 'test',
    createdAt: '2025-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 10,
    watchers: 5,
    commits30d: 5,
    commits90d: 15,
    releases12mo: 2,
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 2,
    issuesClosed90d: 5,
    uniqueCommitAuthors90d: 3,
    totalContributors: 4,
    maintainerCount: 'unavailable',
    commitCountsByAuthor: { alice: 10, bob: 5 },
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
    missingFields: [],
  } as unknown as AnalysisResult
  return { ...base, ...overrides }
}

describe('Contributors age-guard (P2-F11)', () => {
  it('renders "Insufficient" when ageInDays is below the Resilience threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumResilienceScoringAgeDays - 1 })
    const score = getContributorsScore(result)
    expect(score.value).toBe('Insufficient verified public data')
    expect(score.summary).toContain(`${MATURITY_CONFIG.minimumResilienceScoringAgeDays} d`)
  })

  it('does NOT fire when ageInDays is above the threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumResilienceScoringAgeDays + 1 })
    const score = getContributorsScore(result)
    // Falls through to normal scoring — may be numeric or 'Insufficient' for
    // other (non-age) reasons; the guard's summary text must NOT be present.
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumResilienceScoringAgeDays} d`)
    }
  })

  it('does NOT fire when ageInDays is unavailable', () => {
    const result = baseResult({ ageInDays: 'unavailable' as const })
    const score = getContributorsScore(result)
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumResilienceScoringAgeDays} d`)
    }
  })
})

describe('Activity age-guard (P2-F11)', () => {
  it('renders "Insufficient" when ageInDays is below the Activity threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumActivityScoringAgeDays - 1 })
    const score = getActivityScore(result)
    expect(score.value).toBe('Insufficient verified public data')
    expect(score.summary).toContain(`${MATURITY_CONFIG.minimumActivityScoringAgeDays} d`)
  })

  it('does NOT fire when ageInDays is above the threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumActivityScoringAgeDays + 1 })
    const score = getActivityScore(result)
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumActivityScoringAgeDays} d`)
    }
  })

  it('does NOT fire when ageInDays is unavailable', () => {
    const result = baseResult({ ageInDays: 'unavailable' as const })
    const score = getActivityScore(result)
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumActivityScoringAgeDays} d`)
    }
  })
})
