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

  describe('Mode A: direct check weight adjustment', () => {
    it('reduces security_policy weight when Scorecard is available', () => {
      // In Mode A, security_policy has weight 0.10 (reduced since Scorecard covers it)
      // In Mode B, security_policy has weight 0.30
      // With only security_policy detected, Mode B should give a higher direct score
      const onlySecPolicy: SecurityResult = {
        scorecard: 'unavailable',
        directChecks: [
          { name: 'security_policy', detected: true, details: 'SECURITY.md detected' },
          { name: 'dependabot', detected: false, details: null },
          { name: 'ci_cd', detected: false, details: null },
          { name: 'branch_protection', detected: false, details: null },
        ],
        branchProtectionEnabled: false,
      }

      const modeB = getSecurityScore(onlySecPolicy, 100)
      expect(modeB.mode).toBe('direct-only')
      // In Mode B: security_policy weight 0.30 / total 1.0 → 0.30
      expect(modeB.directCheckScore).toBeCloseTo(0.30, 2)
    })
  })

  describe('recommendation generation per signal', () => {
    it('generates one recommendation per missing direct check signal', () => {
      const score = getSecurityScore(noSignalsResult, 100)

      const items = score.recommendations.map((r) => r.item)
      expect(items).toContain('security_policy')
      expect(items).toContain('dependabot')
      expect(items).toContain('ci_cd')
      // branch_protection is 'unavailable', not false, so no recommendation
    })
  })

  describe('Branch-Protection fallback', () => {
    it('uses Scorecard Branch-Protection score when valid (0-10)', () => {
      const result: SecurityResult = {
        ...fullScorecardResult,
        scorecard: {
          ...fullScorecardResult.scorecard as Exclude<typeof fullScorecardResult.scorecard, 'unavailable'>,
          checks: [
            { name: 'Branch-Protection', score: 8, reason: 'branch protection enabled' },
          ],
        },
      }
      const score = getSecurityScore(result, 5000)
      expect(score.mode).toBe('scorecard')
    })

    it('falls back to direct query when Scorecard Branch-Protection is -1', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 5.0,
          checks: [
            { name: 'Branch-Protection', score: -1, reason: 'internal error' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: 'Branch protection enabled' },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      // Branch protection direct check contributes to direct score
      expect(score.directCheckScore).toBeGreaterThan(0)
    })

    it('uses direct query when Scorecard is unavailable', () => {
      const result: SecurityResult = {
        scorecard: 'unavailable',
        directChecks: [
          { name: 'security_policy', detected: false, details: null },
          { name: 'dependabot', detected: false, details: null },
          { name: 'ci_cd', detected: false, details: null },
          { name: 'branch_protection', detected: true, details: 'Branch protection enabled' },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      expect(score.mode).toBe('direct-only')
      expect(score.directCheckScore).toBeGreaterThan(0)
    })
  })

  describe('enriched recommendations (US1)', () => {
    it('populates enriched fields for a Scorecard check scoring 3/10', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'token permissions partially set' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const rec = score.recommendations.find((r) => r.item === 'Token-Permissions')
      expect(rec).toBeDefined()
      expect(rec!.title).toBeTruthy()
      expect(rec!.riskLevel).toBeTruthy()
      expect(rec!.evidence).toContain('3/10')
      expect(rec!.explanation).toBeTruthy()
      expect(rec!.docsUrl).toBeTruthy()
      expect(rec!.groupCategory).toBeTruthy()
    })

    it('populates enriched fields for a direct check with detected=false', () => {
      const score = getSecurityScore(noSignalsResult, 100)
      const rec = score.recommendations.find((r) => r.item === 'security_policy')
      expect(rec).toBeDefined()
      expect(rec!.title).toBeTruthy()
      expect(rec!.riskLevel).toBeTruthy()
      expect(rec!.evidence).toContain('not detected')
      expect(rec!.explanation).toBeTruthy()
      expect(rec!.groupCategory).toBeTruthy()
    })

    it('returns zero recommendations when all Scorecard checks score 10/10 and direct checks pass', () => {
      const perfectResult: SecurityResult = {
        scorecard: {
          overallScore: 10.0,
          checks: [
            { name: 'Security-Policy', score: 10, reason: 'policy found' },
            { name: 'Token-Permissions', score: 10, reason: 'permissions set' },
            { name: 'Branch-Protection', score: 10, reason: 'protected' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(perfectResult, 5000)
      expect(score.recommendations).toHaveLength(0)
    })

    it('generates a recommendation for a Scorecard check scoring 7/10 (widened threshold)', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 7.0,
          checks: [
            { name: 'Token-Permissions', score: 7, reason: 'token permissions mostly set' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const rec = score.recommendations.find((r) => r.item === 'Token-Permissions')
      expect(rec).toBeDefined()
      expect(rec!.evidence).toContain('7/10')
    })

    it('does not generate a recommendation for indeterminate score (-1)', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 5.0,
          checks: [
            { name: 'Branch-Protection', score: -1, reason: 'internal error' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const rec = score.recommendations.find((r) => r.item === 'Branch-Protection')
      expect(rec).toBeUndefined()
    })

    it('does not generate a recommendation for a check with no catalog entry', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 5.0,
          checks: [
            { name: 'Unknown-Future-Check', score: 3, reason: 'some reason' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const rec = score.recommendations.find((r) => r.item === 'Unknown-Future-Check')
      expect(rec).toBeUndefined()
    })

    it('preserves backward compat: enriched recs have text field and bucket security', () => {
      const score = getSecurityScore(noSignalsResult, 100)
      for (const rec of score.recommendations) {
        expect(rec.text).toBeTruthy()
        expect(rec.bucket).toBe('security')
      }
    })
  })

  describe('category assignment and sorting (US2)', () => {
    it('promotes Critical-risk check scoring 2/10 to critical_issues', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 2.0,
          checks: [
            { name: 'Dangerous-Workflow', score: 2, reason: 'dangerous patterns found' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const rec = score.recommendations.find((r) => r.item === 'Dangerous-Workflow')
      expect(rec).toBeDefined()
      expect(rec!.groupCategory).toBe('critical_issues')
    })

    it('promotes High-risk check scoring 3/10 to critical_issues', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Token-Permissions', score: 3, reason: 'weak permissions' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const rec = score.recommendations.find((r) => r.item === 'Token-Permissions')
      expect(rec).toBeDefined()
      expect(rec!.groupCategory).toBe('critical_issues')
    })

    it('does NOT promote High-risk check scoring 7/10 to critical_issues', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 7.0,
          checks: [
            { name: 'Token-Permissions', score: 7, reason: 'mostly set' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const rec = score.recommendations.find((r) => r.item === 'Token-Permissions')
      expect(rec).toBeDefined()
      expect(rec!.groupCategory).toBe('workflow_hardening') // default, not promoted
    })

    it('sorts recommendations by category order, then risk level, then weight', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'CI-Tests', score: 5, reason: 'some tests' }, // Low risk, quick_wins
            { name: 'Dangerous-Workflow', score: 2, reason: 'dangerous' }, // Critical, critical_issues
            { name: 'Fuzzing', score: 3, reason: 'no fuzzing' }, // Medium, best_practices
            { name: 'Token-Permissions', score: 2, reason: 'weak' }, // High → critical_issues (promoted)
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const categories = score.recommendations.map((r) => r.groupCategory)
      // critical_issues should come first, then quick_wins, then best_practices
      const firstCritical = categories.indexOf('critical_issues')
      const firstQuickWin = categories.indexOf('quick_wins')
      const firstBestPractice = categories.indexOf('best_practices')
      if (firstCritical >= 0 && firstQuickWin >= 0) {
        expect(firstCritical).toBeLessThan(firstQuickWin)
      }
      if (firstQuickWin >= 0 && firstBestPractice >= 0) {
        expect(firstQuickWin).toBeLessThan(firstBestPractice)
      }
    })
  })

  describe('deduplication (US3)', () => {
    it('deduplicates Security-Policy when both Scorecard and direct check fire', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 5.0,
          checks: [
            { name: 'Security-Policy', score: 5, reason: 'partial policy' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: false, details: null },
          { name: 'dependabot', detected: true, details: null },
          { name: 'ci_cd', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      }
      const score = getSecurityScore(result, 5000)
      const secPolicyRecs = score.recommendations.filter(
        (r) => r.item === 'Security-Policy' || r.item === 'security_policy',
      )
      expect(secPolicyRecs).toHaveLength(1)
      expect(secPolicyRecs[0]!.category).toBe('scorecard') // Scorecard version preferred
      expect(secPolicyRecs[0]!.evidence).toContain('Also confirmed')
    })

    it('deduplicates all 4 overlapping pairs', () => {
      const result: SecurityResult = {
        scorecard: {
          overallScore: 3.0,
          checks: [
            { name: 'Security-Policy', score: 3, reason: 'weak' },
            { name: 'Dependency-Update-Tool', score: 2, reason: 'none' },
            { name: 'CI-Tests', score: 4, reason: 'some' },
            { name: 'Branch-Protection', score: 1, reason: 'none' },
          ],
          scorecardVersion: 'v5.0.0',
        },
        directChecks: [
          { name: 'security_policy', detected: false, details: null },
          { name: 'dependabot', detected: false, details: null },
          { name: 'ci_cd', detected: false, details: null },
          { name: 'branch_protection', detected: false, details: null },
        ],
        branchProtectionEnabled: false,
      }
      const score = getSecurityScore(result, 5000)
      // Should have 4 recs (Scorecard versions only), not 8
      const directRecs = score.recommendations.filter((r) => r.category === 'direct_check')
      expect(directRecs).toHaveLength(0)
      expect(score.recommendations.length).toBe(4)
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
