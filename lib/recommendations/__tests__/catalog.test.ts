import { describe, expect, it } from 'vitest'
import { RECOMMENDATION_CATALOG, getCatalogId, getCatalogEntryByKey, getCatalogEntriesByTag } from '../catalog'

describe('RECOMMENDATION_CATALOG', () => {
  it('has no duplicate IDs', () => {
    const ids = RECOMMENDATION_CATALOG.map((e) => e.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('has no duplicate keys', () => {
    const keys = RECOMMENDATION_CATALOG.map((e) => e.key)
    expect(keys.length).toBe(new Set(keys).size)
  })

  it('contains entries for all five buckets', () => {
    const buckets = new Set(RECOMMENDATION_CATALOG.map((e) => e.bucket))
    expect(buckets).toEqual(new Set(['Security', 'Activity', 'Responsiveness', 'Contributors', 'Documentation']))
  })

  it('IDs follow the PREFIX-N pattern', () => {
    for (const entry of RECOMMENDATION_CATALOG) {
      expect(entry.id).toMatch(/^[A-Z]{3}-\d+$/)
    }
  })

  it('IDs use the correct prefix for their bucket', () => {
    const prefixMap: Record<string, string> = {
      Security: 'SEC', Activity: 'ACT', Responsiveness: 'RSP',
      Contributors: 'CTR', Documentation: 'DOC',
    }
    for (const entry of RECOMMENDATION_CATALOG) {
      const expectedPrefix = prefixMap[entry.bucket]
      expect(entry.id.startsWith(`${expectedPrefix}-`)).toBe(true)
    }
  })

  it('has 17 security entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Security')).toHaveLength(17)
  })

  it('has 8 activity entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Activity')).toHaveLength(8)
  })

  it('has 3 responsiveness entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Responsiveness')).toHaveLength(3)
  })

  it('has 10 contributors entries (7 original + 3 onboarding)', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Contributors')).toHaveLength(10)
  })

  it('has 3 onboarding-tagged entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => (e.tags ?? []).includes('onboarding'))).toHaveLength(3)
  })

  it('CTR-8 targets good_first_issues with onboarding tag', () => {
    const entry = RECOMMENDATION_CATALOG.find((e) => e.id === 'CTR-8')
    expect(entry).toBeDefined()
    expect(entry?.key).toBe('good_first_issues')
    expect(entry?.tags).toContain('onboarding')
  })

  it('CTR-9 targets dev_environment_setup with onboarding tag', () => {
    const entry = RECOMMENDATION_CATALOG.find((e) => e.id === 'CTR-9')
    expect(entry).toBeDefined()
    expect(entry?.key).toBe('dev_environment_setup')
    expect(entry?.tags).toContain('onboarding')
  })

  it('CTR-10 targets new_contributor_acceptance with onboarding tag', () => {
    const entry = RECOMMENDATION_CATALOG.find((e) => e.id === 'CTR-10')
    expect(entry).toBeDefined()
    expect(entry?.key).toBe('new_contributor_acceptance')
    expect(entry?.tags).toContain('onboarding')
  })

  it('has 21 documentation entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Documentation')).toHaveLength(21)
  })

  it('has 5 community-tagged entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => (e.tags ?? []).includes('community'))).toHaveLength(5)
  })

  it('has 7 release-health-tagged entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => (e.tags ?? []).includes('release-health'))).toHaveLength(7)
  })
})

describe('getCatalogId', () => {
  it('returns ID for known keys', () => {
    expect(getCatalogId('Dangerous-Workflow')).toBe('SEC-1')
    expect(getCatalogId('pr_flow')).toBe('ACT-1')
    expect(getCatalogId('file:readme')).toBe('DOC-1')
  })

  it('returns ID for direct-check aliases', () => {
    expect(getCatalogId('branch_protection')).toBe('SEC-3')
    expect(getCatalogId('dependabot')).toBe('SEC-6')
    expect(getCatalogId('security_policy')).toBe('SEC-14')
    expect(getCatalogId('ci_cd')).toBe('SEC-16')
  })

  it('returns undefined for unknown keys', () => {
    expect(getCatalogId('nonexistent')).toBeUndefined()
  })
})

describe('getCatalogEntryByKey', () => {
  it('returns full entry for known keys', () => {
    const entry = getCatalogEntryByKey('Token-Permissions')
    expect(entry).toEqual({
      id: 'SEC-8',
      bucket: 'Security',
      key: 'Token-Permissions',
      title: 'Restrict GitHub Actions token permissions',
      tags: ['supply-chain'],
    })
  })

  it('returns entry for alias keys', () => {
    const entry = getCatalogEntryByKey('branch_protection')
    expect(entry?.id).toBe('SEC-3')
    expect(entry?.key).toBe('Branch-Protection')
  })

  it('returns undefined for unknown keys', () => {
    expect(getCatalogEntryByKey('nonexistent')).toBeUndefined()
  })
})

describe('getCatalogEntriesByTag', () => {
  it('returns governance-tagged entries', () => {
    const governance = getCatalogEntriesByTag('governance')
    const ids = governance.map((e) => e.id).sort()
    expect(ids).toEqual([
      'CTR-2', 'CTR-3', 'CTR-4',
      'DOC-12', 'DOC-13', 'DOC-14', 'DOC-17',
      'DOC-2', 'DOC-3', 'DOC-4', 'DOC-5', 'DOC-6',
      'SEC-14', 'SEC-17', 'SEC-3', 'SEC-5',
    ])
  })

  it('returns supply-chain-tagged entries', () => {
    const entries = getCatalogEntriesByTag('supply-chain')
    const ids = entries.map((e) => e.id).sort()
    expect(ids).toEqual([
      'SEC-12', 'SEC-15', 'SEC-4', 'SEC-6', 'SEC-7', 'SEC-8',
    ])
  })

  it('returns quick-win-tagged entries', () => {
    const entries = getCatalogEntriesByTag('quick-win')
    const ids = entries.map((e) => e.id).sort()
    expect(ids).toEqual([
      'DOC-1', 'DOC-17', 'DOC-2', 'DOC-20', 'DOC-21', 'DOC-3', 'DOC-4', 'DOC-5', 'DOC-6',
      'SEC-14', 'SEC-16', 'SEC-6',
    ])
  })

  it('returns compliance-tagged entries', () => {
    const entries = getCatalogEntriesByTag('compliance')
    const ids = entries.map((e) => e.id).sort()
    expect(ids).toEqual([
      'DOC-12', 'DOC-13', 'DOC-14', 'DOC-2',
      'SEC-14', 'SEC-17',
    ])
  })

  it('returns contrib-ex-tagged entries', () => {
    const entries = getCatalogEntriesByTag('contrib-ex')
    const ids = entries.map((e) => e.id).sort()
    expect(ids).toEqual([
      'ACT-2', 'ACT-5',
      'CTR-5', 'CTR-6', 'CTR-7',
      'DOC-1', 'DOC-10', 'DOC-11', 'DOC-15', 'DOC-16', 'DOC-3', 'DOC-4',
      'DOC-7', 'DOC-8', 'DOC-9',
      'RSP-1',
    ])
  })

  it('returns community-tagged entries', () => {
    const entries = getCatalogEntriesByTag('community')
    const ids = entries.map((e) => e.id).sort()
    expect(ids).toEqual(['ACT-5', 'CTR-3', 'DOC-15', 'DOC-16', 'DOC-17'])
  })

  it('entries with multiple tags return for each tag', () => {
    // SEC-6 is both supply-chain and quick-win
    const supplyChain = getCatalogEntriesByTag('supply-chain')
    const quickWin = getCatalogEntriesByTag('quick-win')
    expect(supplyChain.find((e) => e.id === 'SEC-6')).toBeDefined()
    expect(quickWin.find((e) => e.id === 'SEC-6')).toBeDefined()

    // DOC-2 is governance, quick-win, and compliance
    const governance = getCatalogEntriesByTag('governance')
    const compliance = getCatalogEntriesByTag('compliance')
    expect(governance.find((e) => e.id === 'DOC-2')).toBeDefined()
    expect(quickWin.find((e) => e.id === 'DOC-2')).toBeDefined()
    expect(compliance.find((e) => e.id === 'DOC-2')).toBeDefined()
  })

  it('returns empty array for unknown tag', () => {
    expect(getCatalogEntriesByTag('nonexistent')).toEqual([])
  })
})
