import { describe, expect, it } from 'vitest'
import { classifyTwoFactorRequirement } from './two-factor'

describe('classifyTwoFactorRequirement', () => {
  it('returns "enforced" when the flag is literal true', () => {
    expect(classifyTwoFactorRequirement(true)).toBe('enforced')
  })

  it('returns "not-enforced" when the flag is literal false', () => {
    expect(classifyTwoFactorRequirement(false)).toBe('not-enforced')
  })

  it('returns "unknown" when the flag is null — caller lacks org-owner scope', () => {
    expect(classifyTwoFactorRequirement(null)).toBe('unknown')
  })

  it('returns "unknown" when the flag is undefined — field absent', () => {
    expect(classifyTwoFactorRequirement(undefined)).toBe('unknown')
  })
})
