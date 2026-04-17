import { describe, expect, it } from 'vitest'
import { assignReferenceIds, getBucketPrefix, resolveReferenceId } from '../reference-id'

describe('getBucketPrefix', () => {
  it.each([
    ['Security', 'SEC'],
    ['Activity', 'ACT'],
    ['Responsiveness', 'RSP'],
    ['Contributors', 'CTR'],
    ['Documentation', 'DOC'],
  ])('maps %s to %s', (bucket, expected) => {
    expect(getBucketPrefix(bucket)).toBe(expected)
  })

  it('falls back to first 3 uppercase chars for unknown buckets', () => {
    expect(getBucketPrefix('Custom')).toBe('CUS')
  })
})

describe('resolveReferenceId', () => {
  it('returns catalog ID for known security keys', () => {
    expect(resolveReferenceId('Dangerous-Workflow', 'Security', 1)).toBe('SEC-1')
    expect(resolveReferenceId('Token-Permissions', 'Security', 99)).toBe('SEC-8')
  })

  it('returns catalog ID for direct-check aliases', () => {
    expect(resolveReferenceId('branch_protection', 'Security', 1)).toBe('SEC-3')
    expect(resolveReferenceId('dependabot', 'Security', 1)).toBe('SEC-6')
    expect(resolveReferenceId('security_policy', 'Security', 1)).toBe('SEC-14')
    expect(resolveReferenceId('ci_cd', 'Security', 1)).toBe('SEC-16')
  })

  it('returns catalog ID for activity keys', () => {
    expect(resolveReferenceId('pr_flow', 'Activity', 1)).toBe('ACT-1')
    expect(resolveReferenceId('sustained_activity', 'Activity', 1)).toBe('ACT-4')
  })

  it('returns catalog ID for responsiveness keys', () => {
    expect(resolveReferenceId('response_time', 'Responsiveness', 1)).toBe('RSP-1')
    expect(resolveReferenceId('backlog_health', 'Responsiveness', 1)).toBe('RSP-3')
  })

  it('returns catalog ID for contributors keys', () => {
    expect(resolveReferenceId('contributor_diversity', 'Contributors', 1)).toBe('CTR-1')
    expect(resolveReferenceId('no_maintainers', 'Contributors', 1)).toBe('CTR-2')
  })

  it('returns catalog ID for documentation keys', () => {
    expect(resolveReferenceId('file:readme', 'Documentation', 1)).toBe('DOC-1')
    expect(resolveReferenceId('section:usage', 'Documentation', 1)).toBe('DOC-9')
    expect(resolveReferenceId('licensing:dco_cla', 'Documentation', 1)).toBe('DOC-14')
    expect(resolveReferenceId('file:governance', 'Documentation', 99)).toBe('DOC-17')
  })

  it('falls back to sequential ID for unknown keys', () => {
    expect(resolveReferenceId('unknown_key', 'Activity', 5)).toBe('ACT-5')
  })
})

describe('assignReferenceIds', () => {
  it('assigns catalog IDs when keys match', () => {
    const items = [
      { bucket: 'Activity', key: 'pr_flow', message: 'first' },
      { bucket: 'Activity', key: 'issue_flow', message: 'second' },
      { bucket: 'Documentation', key: 'file:readme', message: 'doc1' },
    ]
    const result = assignReferenceIds(items)
    expect(result.map((r) => r.referenceId)).toEqual(['ACT-1', 'ACT-2', 'DOC-1'])
  })

  it('preserves original item properties', () => {
    const items = [{ bucket: 'Security', key: 'Dangerous-Workflow', extra: 42 }]
    const result = assignReferenceIds(items)
    expect(result[0]).toMatchObject({ bucket: 'Security', key: 'Dangerous-Workflow', extra: 42, referenceId: 'SEC-1' })
  })

  it('returns empty array for empty input', () => {
    expect(assignReferenceIds([])).toEqual([])
  })

  it('uses fallback sequential IDs for dynamic keys (starting at 101)', () => {
    const items = [
      { bucket: 'Documentation', key: 'inclusive_naming:branch:master' },
      { bucket: 'Documentation', key: 'inclusive_naming:description:whitelist' },
    ]
    const result = assignReferenceIds(items)
    expect(result[0]!.referenceId).toBe('DOC-101')
    expect(result[1]!.referenceId).toBe('DOC-102')
  })

  it('mixes catalog and fallback IDs correctly', () => {
    const items = [
      { bucket: 'Documentation', key: 'file:readme' },
      { bucket: 'Documentation', key: 'inclusive_naming:branch:master' },
      { bucket: 'Documentation', key: 'file:contributing' },
    ]
    const result = assignReferenceIds(items)
    expect(result.map((r) => r.referenceId)).toEqual(['DOC-1', 'DOC-101', 'DOC-3'])
  })

  it('same catalog key always resolves to same ID regardless of position', () => {
    const items1 = [
      { bucket: 'Activity', key: 'pr_flow' },
      { bucket: 'Activity', key: 'sustained_activity' },
    ]
    const items2 = [
      { bucket: 'Activity', key: 'sustained_activity' },
      { bucket: 'Activity', key: 'pr_flow' },
    ]
    const result1 = assignReferenceIds(items1)
    const result2 = assignReferenceIds(items2)
    // ACT-4 is sustained_activity regardless of order
    expect(result1[1]!.referenceId).toBe('ACT-4')
    expect(result2[0]!.referenceId).toBe('ACT-4')
    // ACT-1 is pr_flow regardless of order
    expect(result1[0]!.referenceId).toBe('ACT-1')
    expect(result2[1]!.referenceId).toBe('ACT-1')
  })
})
