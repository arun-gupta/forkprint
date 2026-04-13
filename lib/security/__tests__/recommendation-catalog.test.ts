import { describe, it, expect } from 'vitest'
import { RECOMMENDATION_CATALOG, CATEGORY_DEFINITIONS, getCatalogEntry } from '@/lib/security/recommendation-catalog'
import type { RiskLevel, RecommendationCategoryKey } from '@/lib/security/analysis-result'

const EXPECTED_SCORECARD_CHECKS = [
  'Dangerous-Workflow',
  'Webhooks',
  'Branch-Protection',
  'Binary-Artifacts',
  'Code-Review',
  'Dependency-Update-Tool',
  'Fuzzing',
  'License',
  'Maintained',
  'Packaging',
  'Pinned-Dependencies',
  'SAST',
  'Security-Policy',
  'Signed-Releases',
  'Token-Permissions',
  'Vulnerabilities',
  'CI-Tests',
]

const EXPECTED_DIRECT_CHECKS = [
  'security_policy',
  'dependabot',
  'ci_cd',
  'branch_protection',
]

const VALID_RISK_LEVELS: RiskLevel[] = ['Critical', 'High', 'Medium', 'Low']
const VALID_CATEGORIES: RecommendationCategoryKey[] = ['critical_issues', 'quick_wins', 'workflow_hardening', 'best_practices']

describe('RECOMMENDATION_CATALOG', () => {
  it('contains entries for all 17 expected Scorecard checks', () => {
    const scorecardKeys = RECOMMENDATION_CATALOG
      .filter((e) => e.source === 'scorecard')
      .map((e) => e.key)

    for (const check of EXPECTED_SCORECARD_CHECKS) {
      expect(scorecardKeys).toContain(check)
    }
  })

  it('contains entries for all 4 direct checks', () => {
    const directKeys = RECOMMENDATION_CATALOG
      .filter((e) => e.source === 'direct_check')
      .map((e) => e.key)

    for (const check of EXPECTED_DIRECT_CHECKS) {
      expect(directKeys).toContain(check)
    }
  })

  it('has unique keys across all entries', () => {
    const keys = RECOMMENDATION_CATALOG.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('has all required fields on every entry', () => {
    for (const entry of RECOMMENDATION_CATALOG) {
      expect(entry.key).toBeTruthy()
      expect(entry.source).toBeTruthy()
      expect(entry.title).toBeTruthy()
      expect(entry.riskLevel).toBeTruthy()
      expect(entry.groupCategory).toBeTruthy()
      expect(entry.whyItMatters).toBeTruthy()
      expect(entry.remediation).toBeTruthy()
    }
  })

  it('uses valid riskLevel values on every entry', () => {
    for (const entry of RECOMMENDATION_CATALOG) {
      expect(VALID_RISK_LEVELS).toContain(entry.riskLevel)
    }
  })

  it('uses valid groupCategory values on every entry', () => {
    for (const entry of RECOMMENDATION_CATALOG) {
      expect(VALID_CATEGORIES).toContain(entry.groupCategory)
    }
  })
})

describe('deduplication mappings', () => {
  it('Security-Policy maps to security_policy direct check', () => {
    const entry = getCatalogEntry('Security-Policy')
    expect(entry).toBeDefined()
    expect(entry!.directCheckMapping).toBe('security_policy')
  })

  it('Dependency-Update-Tool maps to dependabot direct check', () => {
    const entry = getCatalogEntry('Dependency-Update-Tool')
    expect(entry).toBeDefined()
    expect(entry!.directCheckMapping).toBe('dependabot')
  })

  it('CI-Tests maps to ci_cd direct check', () => {
    const entry = getCatalogEntry('CI-Tests')
    expect(entry).toBeDefined()
    expect(entry!.directCheckMapping).toBe('ci_cd')
  })

  it('Branch-Protection maps to branch_protection direct check', () => {
    const entry = getCatalogEntry('Branch-Protection')
    expect(entry).toBeDefined()
    expect(entry!.directCheckMapping).toBe('branch_protection')
  })
})

describe('CATEGORY_DEFINITIONS', () => {
  it('defines all 4 categories in order', () => {
    expect(CATEGORY_DEFINITIONS).toHaveLength(4)
    expect(CATEGORY_DEFINITIONS[0]!.key).toBe('critical_issues')
    expect(CATEGORY_DEFINITIONS[1]!.key).toBe('quick_wins')
    expect(CATEGORY_DEFINITIONS[2]!.key).toBe('workflow_hardening')
    expect(CATEGORY_DEFINITIONS[3]!.key).toBe('best_practices')
  })

  it('has ascending order values', () => {
    for (let i = 1; i < CATEGORY_DEFINITIONS.length; i++) {
      expect(CATEGORY_DEFINITIONS[i]!.order).toBeGreaterThan(CATEGORY_DEFINITIONS[i - 1]!.order)
    }
  })
})

describe('getCatalogEntry', () => {
  it('returns the entry for a known key', () => {
    const entry = getCatalogEntry('Token-Permissions')
    expect(entry).toBeDefined()
    expect(entry!.key).toBe('Token-Permissions')
  })

  it('returns undefined for an unknown key', () => {
    expect(getCatalogEntry('Unknown-Check')).toBeUndefined()
  })
})
