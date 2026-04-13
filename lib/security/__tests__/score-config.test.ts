import { describe, it, expect } from 'vitest'
import { getSecurityScore } from '@/lib/security/score-config'
import type { SecurityResult } from '@/lib/security/analysis-result'

const fullScorecardResult: SecurityResult = {
  scorecard: {
    overallScore: 7.5,
    checks: [
      { name: 'Security-Policy', score: 10, reason: 'policy found' },
      { name: 'Code-Review', score: 8, reason: 'reviews found' },
      { name: 'Maintained', score: 9, reason: 'actively maintained' },
      { name: 'Pinned-Dependencies', score: 5, reason: 'some pinned' },
      { name: 'Signed-Releases', score: 0, reason: 'no signed releases' },
      { name: 'Fuzzing', score: 0, reason: 'no fuzzing detected' },
      { name: 'SAST', score: 6, reason: 'SAST detected' },
      { name: 'Dangerous-Workflow', score: 10, reason: 'no dangerous patterns' },
      { name: 'Token-Permissions', score: 7, reason: 'token permissions set' },
    ],
    scorecardVersion: 'v5.0.0',
  },
  directChecks: [
    { name: 'security_policy', detected: true, details: 'SECURITY.md detected' },
    { name: 'dependabot', detected: true, details: 'Dependabot configuration detected' },
    { name: 'ci_cd', detected: true, details: '5 workflow file(s) detected' },
    { name: 'branch_protection', detected: true, details: 'Branch protection enabled' },
  ],
  branchProtectionEnabled: true,
}

const directOnlyResult: SecurityResult = {
  scorecard: 'unavailable',
  directChecks: [
    { name: 'security_policy', detected: true, details: 'SECURITY.md detected' },
    { name: 'dependabot', detected: false, details: null },
    { name: 'ci_cd', detected: true, details: '2 workflow file(s) detected' },
    { name: 'branch_protection', detected: 'unavailable', details: null },
  ],
  branchProtectionEnabled: 'unavailable',
}

const noSignalsResult: SecurityResult = {
  scorecard: 'unavailable',
  directChecks: [
    { name: 'security_policy', detected: false, details: null },
    { name: 'dependabot', detected: false, details: null },
    { name: 'ci_cd', detected: false, details: null },
    { name: 'branch_protection', detected: 'unavailable', details: null },
  ],
  branchProtectionEnabled: 'unavailable',
}

describe('getSecurityScore', () => {
  describe('Mode A: Scorecard + direct checks', () => {
    it('computes composite as scorecardNormalized * 0.60 + directComposite * 0.40', () => {
      const score = getSecurityScore(fullScorecardResult, 5000)

      expect(score.mode).toBe('scorecard')
      expect(score.scorecardScore).not.toBeNull()
      expect(score.scorecardScore).toBeCloseTo(0.75, 1) // 7.5 / 10
      expect(score.directCheckScore).toBeGreaterThan(0)
      // composite = 0.75 * 0.60 + directCheckScore * 0.40
      const expectedComposite = 0.75 * 0.60 + score.directCheckScore * 0.40
      expect(score.compositeScore).toBeCloseTo(expectedComposite, 2)
    })

    it('returns scorecard mode when scorecard data is available', () => {
      const score = getSecurityScore(fullScorecardResult, 5000)
      expect(score.mode).toBe('scorecard')
    })

    it('produces a numeric value (not insufficient data) when data is available', () => {
      const score = getSecurityScore(fullScorecardResult, 5000)
      expect(typeof score.value).toBe('number')
    })
  })

  describe('Mode B: Direct checks only', () => {
    it('uses direct checks only when scorecard is unavailable', () => {
      const score = getSecurityScore(directOnlyResult, 100)

      expect(score.mode).toBe('direct-only')
      expect(score.scorecardScore).toBeNull()
      expect(score.directCheckScore).toBeGreaterThan(0)
      expect(score.compositeScore).toBe(score.directCheckScore)
    })

    it('does not penalize for unavailable signals', () => {
      const score = getSecurityScore(directOnlyResult, 100)

      // Branch protection is unavailable — should not count as 0
      // Only security_policy (true) and ci_cd (true) contribute positively
      // dependabot (false) contributes 0
      expect(score.directCheckScore).toBeGreaterThan(0)
    })

    it('returns 0 composite when no signals are detected and all checks are false', () => {
      const allFalseResult: SecurityResult = {
        scorecard: 'unavailable',
        directChecks: [
          { name: 'security_policy', detected: false, details: null },
          { name: 'dependabot', detected: false, details: null },
          { name: 'ci_cd', detected: false, details: null },
          { name: 'branch_protection', detected: false, details: null },
        ],
        branchProtectionEnabled: false,
      }

      const score = getSecurityScore(allFalseResult, 100)
      expect(score.compositeScore).toBe(0)
    })
  })

  describe('recommendations', () => {
    it('generates recommendations for missing signals', () => {
      const score = getSecurityScore(noSignalsResult, 100)

      expect(score.recommendations.length).toBeGreaterThanOrEqual(1)
      expect(score.recommendations.every((r) => r.bucket === 'security')).toBe(true)
    })

    it('generates no recommendations when all direct checks pass', () => {
      const score = getSecurityScore(fullScorecardResult, 5000)

      const directRecs = score.recommendations.filter((r) => r.category === 'direct_check')
      expect(directRecs).toHaveLength(0)
    })

    it('generates recommendations sorted by weight descending', () => {
      const score = getSecurityScore(noSignalsResult, 100)

      for (let i = 1; i < score.recommendations.length; i++) {
        expect(score.recommendations[i]!.weight).toBeLessThanOrEqual(score.recommendations[i - 1]!.weight)
      }
    })
  })

  describe('percentile and tone', () => {
    it('returns percentile when stars are available', () => {
      const score = getSecurityScore(fullScorecardResult, 5000)
      expect(score.percentile).not.toBeNull()
    })

    it('returns null percentile when stars are unavailable', () => {
      const score = getSecurityScore(fullScorecardResult, 'unavailable')
      expect(score.percentile).toBeNull()
      expect(score.tone).toBe('neutral')
    })
  })
})
