import { describe, expect, it } from 'vitest'
import type { LicensingResult } from '@/lib/analyzer/analysis-result'
import { getLicensingScore, type LicensingRecommendation } from '@/lib/documentation/score-config'

function buildLicensingResult(overrides: Partial<LicensingResult> = {}): LicensingResult {
  return {
    license: {
      spdxId: 'MIT',
      name: 'MIT License',
      osiApproved: true,
      permissivenessTier: 'Permissive',
    },
    additionalLicenses: [],
    contributorAgreement: {
      signedOffByRatio: null,
      dcoOrClaBot: false,
      enforced: false,
    },
    ...overrides,
  }
}

describe('getLicensingScore', () => {
  it('scores a repo with OSI-approved license and classified tier', () => {
    const { score, recommendations } = getLicensingScore(buildLicensingResult())

    // license present (0.40) + OSI approved (0.25) + tier classified (0.10) + no DCO (0.00) = 0.75
    expect(score).toBeCloseTo(0.75, 2)
    expect(recommendations.length).toBeGreaterThan(0) // should recommend DCO/CLA
  })

  it('scores 1.0 for fully compliant repo', () => {
    const { score } = getLicensingScore(buildLicensingResult({
      contributorAgreement: {
        signedOffByRatio: 1.0,
        dcoOrClaBot: true,
        enforced: true,
      },
    }))

    expect(score).toBeCloseTo(1.0, 2)
  })

  it('scores 0 for repo with no license', () => {
    const { score, recommendations } = getLicensingScore(buildLicensingResult({
      license: {
        spdxId: null,
        name: null,
        osiApproved: false,
        permissivenessTier: null,
      },
    }))

    expect(score).toBe(0)
    expect(recommendations.some((r) => r.text.toLowerCase().includes('license'))).toBe(true)
  })

  it('gives partial credit for NOASSERTION', () => {
    const { score } = getLicensingScore(buildLicensingResult({
      license: {
        spdxId: 'NOASSERTION',
        name: 'Other',
        osiApproved: false,
        permissivenessTier: null,
      },
    }))

    // NOASSERTION: 0.3 * 0.40 = 0.12 (partial license) + nothing else
    expect(score).toBeCloseTo(0.12, 2)
  })

  it('scores DCO enforcement correctly', () => {
    const { score } = getLicensingScore(buildLicensingResult({
      contributorAgreement: {
        signedOffByRatio: 0.9,
        dcoOrClaBot: false,
        enforced: true,
      },
    }))

    // MIT: 0.40 + 0.25 + 0.10 + 0.25 (enforced) = 1.0
    expect(score).toBeCloseTo(1.0, 2)
  })

  it('generates recommendation for non-OSI license', () => {
    const { recommendations } = getLicensingScore(buildLicensingResult({
      license: {
        spdxId: 'UNKNOWN-1.0',
        name: 'Unknown License',
        osiApproved: false,
        permissivenessTier: null,
      },
    }))

    expect(recommendations.some((r) => r.text.toLowerCase().includes('osi'))).toBe(true)
  })

  it('generates recommendation for missing DCO/CLA', () => {
    const { recommendations } = getLicensingScore(buildLicensingResult())

    expect(recommendations.some((r) => r.item === 'dco_cla')).toBe(true)
  })

  it('does not generate DCO/CLA recommendation when enforced', () => {
    const { recommendations } = getLicensingScore(buildLicensingResult({
      contributorAgreement: {
        signedOffByRatio: 1.0,
        dcoOrClaBot: true,
        enforced: true,
      },
    }))

    expect(recommendations.some((r) => r.item === 'dco_cla')).toBe(false)
  })

  it('counts OSI approval from additional licenses when primary is not OSI', () => {
    const { score } = getLicensingScore(buildLicensingResult({
      license: {
        spdxId: 'UNKNOWN-1.0',
        name: 'Unknown License',
        osiApproved: false,
        permissivenessTier: null,
      },
      additionalLicenses: [
        { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
      ],
    }))

    // license present (0.40) + OSI from additional (0.25) + tier from additional (0.10) = 0.75
    expect(score).toBeCloseTo(0.75, 2)
  })

  it('counts tier classification from additional licenses', () => {
    const { score } = getLicensingScore(buildLicensingResult({
      license: {
        spdxId: 'UNKNOWN-1.0',
        name: 'Unknown License',
        osiApproved: false,
        permissivenessTier: null,
      },
      additionalLicenses: [
        { spdxId: 'Apache-2.0', name: 'Apache License 2.0', osiApproved: true, permissivenessTier: 'Permissive' },
      ],
    }))

    // license present (0.40) + OSI (0.25) + tier (0.10) = 0.75
    expect(score).toBeCloseTo(0.75, 2)
  })
})
