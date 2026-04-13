import { describe, expect, it } from 'vitest'
import { INI_WORD_LIST, TIER_0_EXCLUDED_TERMS, TIER_SEVERITY_LABELS, TIER_PENALTIES } from '@/lib/inclusive-naming/word-list'

describe('INI word list data integrity', () => {
  it('contains only Tier 1, 2, and 3 terms', () => {
    for (const entry of INI_WORD_LIST) {
      expect([1, 2, 3]).toContain(entry.tier)
    }
  })

  it('does not contain any Tier 0 terms', () => {
    const wordListTerms = INI_WORD_LIST.map((e) => e.term)
    for (const excluded of TIER_0_EXCLUDED_TERMS) {
      expect(wordListTerms).not.toContain(excluded)
    }
  })

  it('has non-empty replacements for each entry (except totem-pole)', () => {
    for (const entry of INI_WORD_LIST) {
      if (entry.term === 'totem-pole') continue
      expect(entry.replacements.length, `${entry.term} should have replacements`).toBeGreaterThan(0)
    }
  })

  it('has a non-empty recommendation for each entry', () => {
    for (const entry of INI_WORD_LIST) {
      expect(entry.recommendation.length, `${entry.term} should have a recommendation`).toBeGreaterThan(0)
    }
  })

  it('has a non-empty termPage URL for each entry', () => {
    for (const entry of INI_WORD_LIST) {
      expect(entry.termPage).toMatch(/^https:\/\/inclusivenaming\.org\//)
    }
  })

  it('contains expected Tier 1 terms', () => {
    const tier1Terms = INI_WORD_LIST.filter((e) => e.tier === 1).map((e) => e.term)
    expect(tier1Terms).toContain('master')
    expect(tier1Terms).toContain('whitelist')
    expect(tier1Terms).toContain('blacklist')
    expect(tier1Terms).toContain('master-slave')
    expect(tier1Terms).toContain('blackhat')
    expect(tier1Terms).toContain('whitehat')
    expect(tier1Terms).toContain('grandfathered')
    expect(tier1Terms).toContain('tribe')
    expect(tier1Terms).toContain('cripple')
    expect(tier1Terms).toContain('abort')
  })

  it('contains expected Tier 2 terms', () => {
    const tier2Terms = INI_WORD_LIST.filter((e) => e.tier === 2).map((e) => e.term)
    expect(tier2Terms).toContain('sanity-check')
  })

  it('contains expected Tier 3 terms', () => {
    const tier3Terms = INI_WORD_LIST.filter((e) => e.tier === 3).map((e) => e.term)
    expect(tier3Terms).toContain('blast-radius')
    expect(tier3Terms).toContain('man-in-the-middle')
    expect(tier3Terms).toContain('segregate')
    expect(tier3Terms).toContain('evangelist')
  })

  it('has severity labels for all tiers', () => {
    expect(TIER_SEVERITY_LABELS[1]).toBe('Replace immediately')
    expect(TIER_SEVERITY_LABELS[2]).toBe('Recommended to replace')
    expect(TIER_SEVERITY_LABELS[3]).toBe('Consider replacing')
  })

  it('has penalty values for all tiers in descending order', () => {
    expect(TIER_PENALTIES[1]).toBe(0.25)
    expect(TIER_PENALTIES[2]).toBe(0.15)
    expect(TIER_PENALTIES[3]).toBe(0.10)
    expect(TIER_PENALTIES[1]).toBeGreaterThan(TIER_PENALTIES[2])
    expect(TIER_PENALTIES[2]).toBeGreaterThan(TIER_PENALTIES[3])
  })
})
