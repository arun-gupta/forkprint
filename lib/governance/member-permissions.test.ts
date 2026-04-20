import { describe, it, expect } from 'vitest'
import { evaluatePermissionFlag } from './member-permissions'

const config = { ratioThreshold: 0.10, smallOrgAdminThreshold: 5, smallOrgSizeThreshold: 25 }

describe('evaluatePermissionFlag', () => {
  it('returns null when ratio is below threshold and org is large', () => {
    expect(evaluatePermissionFlag(5, 100, config)).toBeNull()
  })

  it('returns null when ratio equals threshold exactly (boundary: >10% not ≥10%)', () => {
    expect(evaluatePermissionFlag(10, 100, config)).toBeNull()
  })

  it('returns ratio flag when admin ratio exceeds 10%', () => {
    const flag = evaluatePermissionFlag(11, 100, config)
    expect(flag).not.toBeNull()
    expect(flag?.kind).toBe('admin-heavy')
    expect(flag?.thresholdBreached).toBe('ratio')
  })

  it('returns null for small org with ≤5 admins and ratio ≤10%', () => {
    // 5 admins in 100 members: 5% ratio (≤10%), count ≤ 5 — no breach
    expect(evaluatePermissionFlag(5, 100, config)).toBeNull()
  })

  it('returns absolute-count flag when count exceeds small-org threshold but ratio is within limit', () => {
    // Use a high ratio threshold so only the absolute-count rule fires
    const highRatioConfig = { ...config, ratioThreshold: 0.50 }
    // 6 admins in 25 members: 24% ≤ 50% (no ratio breach), 6 > 5 in org ≤ 25 (count breach)
    const flag = evaluatePermissionFlag(6, 25, highRatioConfig)
    expect(flag).not.toBeNull()
    expect(flag?.kind).toBe('admin-heavy')
    expect(flag?.thresholdBreached).toBe('absolute-count')
  })

  it('does not apply small-org rule when org has >25 members', () => {
    // 6 admins in 26 members: ratio = 23% > 10% (ratio fires), but org is not small
    // Use high ratio threshold so only the small-org rule would matter — and it should not fire
    const highRatioConfig = { ...config, ratioThreshold: 0.50 }
    expect(evaluatePermissionFlag(6, 26, highRatioConfig)).toBeNull()
  })

  it('returns both when both thresholds are breached', () => {
    // 6 admins in 25-member org: ratio = 24% > 10% AND 6 > 5 in org ≤ 25
    const flag = evaluatePermissionFlag(6, 25, config)
    expect(flag?.thresholdBreached).toBe('both')
  })

  it('includes a human-readable message with the percentage', () => {
    const flag = evaluatePermissionFlag(15, 100, config)
    expect(flag?.message).toContain('15%')
  })

  it('returns null when totalCount is 0 (no division by zero)', () => {
    expect(evaluatePermissionFlag(0, 0, config)).toBeNull()
  })

  it('works with a 1-member org who is also admin (100% ratio, ratio-only breach)', () => {
    // 1 admin in org of 1: ratio = 100% (ratio breach), count = 1 ≤ 5 (no absolute breach)
    const flag = evaluatePermissionFlag(1, 1, config)
    expect(flag).not.toBeNull()
    expect(flag?.thresholdBreached).toBe('ratio')
  })
})
