import { describe, expect, it } from 'vitest'
import { RECOMMENDATION_CATALOG, getCatalogId, getCatalogEntryByKey } from '../catalog'

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
    expect(buckets).toEqual(new Set(['Security', 'Activity', 'Responsiveness', 'Sustainability', 'Documentation']))
  })

  it('IDs follow the PREFIX-N pattern', () => {
    for (const entry of RECOMMENDATION_CATALOG) {
      expect(entry.id).toMatch(/^[A-Z]{3}-\d+$/)
    }
  })

  it('IDs use the correct prefix for their bucket', () => {
    const prefixMap: Record<string, string> = {
      Security: 'SEC', Activity: 'ACT', Responsiveness: 'RSP',
      Sustainability: 'SUS', Documentation: 'DOC',
    }
    for (const entry of RECOMMENDATION_CATALOG) {
      const expectedPrefix = prefixMap[entry.bucket]
      expect(entry.id.startsWith(`${expectedPrefix}-`)).toBe(true)
    }
  })

  it('has 17 security entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Security')).toHaveLength(17)
  })

  it('has 4 activity entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Activity')).toHaveLength(4)
  })

  it('has 3 responsiveness entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Responsiveness')).toHaveLength(3)
  })

  it('has 2 sustainability entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Sustainability')).toHaveLength(2)
  })

  it('has 14 documentation entries', () => {
    expect(RECOMMENDATION_CATALOG.filter((e) => e.bucket === 'Documentation')).toHaveLength(14)
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
