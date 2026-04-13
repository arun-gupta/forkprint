import { describe, expect, it } from 'vitest'
import {
  OSI_APPROVED_SPDX_IDS,
  PERMISSIVENESS_TIERS,
  getPermissivenessTier,
  isOsiApproved,
} from '@/lib/licensing/license-data'

describe('isOsiApproved', () => {
  it('returns true for common OSI-approved licenses', () => {
    expect(isOsiApproved('MIT')).toBe(true)
    expect(isOsiApproved('Apache-2.0')).toBe(true)
    expect(isOsiApproved('GPL-3.0-only')).toBe(true)
    expect(isOsiApproved('BSD-2-Clause')).toBe(true)
    expect(isOsiApproved('MPL-2.0')).toBe(true)
    expect(isOsiApproved('AGPL-3.0-only')).toBe(true)
  })

  it('returns false for null', () => {
    expect(isOsiApproved(null)).toBe(false)
  })

  it('returns false for NOASSERTION', () => {
    expect(isOsiApproved('NOASSERTION')).toBe(false)
  })

  it('returns false for unrecognized SPDX IDs', () => {
    expect(isOsiApproved('UNKNOWN')).toBe(false)
    expect(isOsiApproved('Custom-License')).toBe(false)
  })

  it('returns true for deprecated GitHub short-form SPDX IDs', () => {
    expect(isOsiApproved('GPL-2.0')).toBe(true)
    expect(isOsiApproved('GPL-3.0')).toBe(true)
    expect(isOsiApproved('AGPL-3.0')).toBe(true)
    expect(isOsiApproved('LGPL-2.1')).toBe(true)
    expect(isOsiApproved('LGPL-3.0')).toBe(true)
  })
})

describe('getPermissivenessTier', () => {
  it('classifies permissive licenses', () => {
    expect(getPermissivenessTier('MIT')).toBe('Permissive')
    expect(getPermissivenessTier('Apache-2.0')).toBe('Permissive')
    expect(getPermissivenessTier('BSD-3-Clause')).toBe('Permissive')
    expect(getPermissivenessTier('ISC')).toBe('Permissive')
    expect(getPermissivenessTier('Unlicense')).toBe('Permissive')
    expect(getPermissivenessTier('0BSD')).toBe('Permissive')
  })

  it('classifies weak copyleft licenses', () => {
    expect(getPermissivenessTier('MPL-2.0')).toBe('Weak Copyleft')
    expect(getPermissivenessTier('LGPL-3.0-only')).toBe('Weak Copyleft')
    expect(getPermissivenessTier('LGPL-2.1-or-later')).toBe('Weak Copyleft')
    expect(getPermissivenessTier('EPL-2.0')).toBe('Weak Copyleft')
    expect(getPermissivenessTier('CDDL-1.0')).toBe('Weak Copyleft')
  })

  it('classifies copyleft licenses', () => {
    expect(getPermissivenessTier('GPL-3.0-only')).toBe('Copyleft')
    expect(getPermissivenessTier('GPL-2.0-or-later')).toBe('Copyleft')
    expect(getPermissivenessTier('AGPL-3.0-only')).toBe('Copyleft')
    expect(getPermissivenessTier('AGPL-3.0-or-later')).toBe('Copyleft')
  })

  it('returns null for null input', () => {
    expect(getPermissivenessTier(null)).toBeNull()
  })

  it('returns null for NOASSERTION', () => {
    expect(getPermissivenessTier('NOASSERTION')).toBeNull()
  })

  it('returns null for OSI-approved licenses without tier mapping', () => {
    // Fair is OSI-approved but not in the tier map
    expect(isOsiApproved('Fair')).toBe(true)
    expect(getPermissivenessTier('Fair')).toBeNull()
  })

  it('returns null for unrecognized SPDX IDs', () => {
    expect(getPermissivenessTier('UNKNOWN')).toBeNull()
  })

  it('classifies deprecated GitHub short-form SPDX IDs correctly', () => {
    expect(getPermissivenessTier('GPL-2.0')).toBe('Copyleft')
    expect(getPermissivenessTier('GPL-3.0')).toBe('Copyleft')
    expect(getPermissivenessTier('AGPL-3.0')).toBe('Copyleft')
    expect(getPermissivenessTier('LGPL-2.1')).toBe('Weak Copyleft')
    expect(getPermissivenessTier('LGPL-3.0')).toBe('Weak Copyleft')
  })
})

describe('data consistency', () => {
  it('all tier-mapped licenses are OSI-approved', () => {
    for (const spdxId of PERMISSIVENESS_TIERS.keys()) {
      expect(OSI_APPROVED_SPDX_IDS.has(spdxId), `${spdxId} is in tier map but not OSI set`).toBe(true)
    }
  })
})
