import { describe, expect, it } from 'vitest'
import { extractLicensingResult, computeSignedOffByRatio, detectDcoClaBots } from '@/lib/analyzer/extract-licensing'

describe('extractLicensingResult', () => {
  it('detects an OSI-approved permissive license', () => {
    const result = extractLicensingResult(
      { spdxId: 'MIT', name: 'MIT License' },
      [],
      null,
    )

    expect(result.license.spdxId).toBe('MIT')
    expect(result.license.name).toBe('MIT License')
    expect(result.license.osiApproved).toBe(true)
    expect(result.license.permissivenessTier).toBe('Permissive')
  })

  it('detects a copyleft license', () => {
    const result = extractLicensingResult(
      { spdxId: 'GPL-3.0-only', name: 'GNU General Public License v3.0 only' },
      [],
      null,
    )

    expect(result.license.osiApproved).toBe(true)
    expect(result.license.permissivenessTier).toBe('Copyleft')
  })

  it('handles NOASSERTION SPDX ID', () => {
    const result = extractLicensingResult(
      { spdxId: 'NOASSERTION', name: 'Other' },
      [],
      null,
    )

    expect(result.license.spdxId).toBe('NOASSERTION')
    expect(result.license.osiApproved).toBe(false)
    expect(result.license.permissivenessTier).toBeNull()
  })

  it('handles null license info', () => {
    const result = extractLicensingResult(null, [], null)

    expect(result.license.spdxId).toBeNull()
    expect(result.license.name).toBeNull()
    expect(result.license.osiApproved).toBe(false)
    expect(result.license.permissivenessTier).toBeNull()
  })

  it('detects DCO enforcement from commit trailers', () => {
    const commits = [
      { message: 'Fix bug\n\nSigned-off-by: Alice <a@b.com>' },
      { message: 'Add feature\n\nSigned-off-by: Bob <b@b.com>' },
      { message: 'Refactor code' },
    ]
    const result = extractLicensingResult(
      { spdxId: 'MIT', name: 'MIT License' },
      commits,
      null,
    )

    expect(result.contributorAgreement.signedOffByRatio).toBeCloseTo(2 / 3, 2)
    expect(result.contributorAgreement.enforced).toBe(false) // below 0.8 threshold
  })

  it('detects DCO enforcement when ratio is above threshold', () => {
    const commits = [
      { message: 'Fix\n\nSigned-off-by: Alice <a@b.com>' },
      { message: 'Add\n\nSigned-off-by: Bob <b@b.com>' },
      { message: 'Update\n\nSigned-off-by: Carol <c@b.com>' },
      { message: 'Refactor\n\nSigned-off-by: Dave <d@b.com>' },
      { message: 'Clean\n\nSigned-off-by: Eve <e@b.com>' },
    ]
    const result = extractLicensingResult(
      { spdxId: 'Apache-2.0', name: 'Apache License 2.0' },
      commits,
      null,
    )

    expect(result.contributorAgreement.signedOffByRatio).toBe(1.0)
    expect(result.contributorAgreement.enforced).toBe(true)
  })

  it('detects CLA bot in workflow files', () => {
    const workflowDir = {
      entries: [
        { name: 'ci.yml', object: { text: 'name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest' } },
        { name: 'cla.yml', object: { text: 'name: CLA\nuses: cla-assistant/cla-assistant@v2' } },
      ],
    }
    const result = extractLicensingResult(
      { spdxId: 'MIT', name: 'MIT License' },
      [],
      workflowDir,
    )

    expect(result.contributorAgreement.dcoOrClaBot).toBe(true)
    expect(result.contributorAgreement.enforced).toBe(true)
  })

  it('handles empty commits and no workflow dir', () => {
    const result = extractLicensingResult(
      { spdxId: 'MIT', name: 'MIT License' },
      [],
      null,
    )

    expect(result.contributorAgreement.signedOffByRatio).toBeNull()
    expect(result.contributorAgreement.dcoOrClaBot).toBe(false)
    expect(result.contributorAgreement.enforced).toBe(false)
  })
})

describe('computeSignedOffByRatio', () => {
  it('returns null for empty commits', () => {
    expect(computeSignedOffByRatio([])).toBeNull()
  })

  it('returns 0 when no commits have Signed-off-by', () => {
    const commits = [{ message: 'Fix bug' }, { message: 'Add feature' }]
    expect(computeSignedOffByRatio(commits)).toBe(0)
  })

  it('returns 1 when all commits have Signed-off-by', () => {
    const commits = [
      { message: 'Fix\n\nSigned-off-by: A <a@b.com>' },
      { message: 'Add\n\nSigned-off-by: B <b@b.com>' },
    ]
    expect(computeSignedOffByRatio(commits)).toBe(1)
  })

  it('is case-insensitive for Signed-off-by', () => {
    const commits = [{ message: 'Fix\n\nsigned-off-by: A <a@b.com>' }]
    expect(computeSignedOffByRatio(commits)).toBe(1)
  })
})

describe('detectDcoClaBots', () => {
  it('returns false for null workflow dir', () => {
    expect(detectDcoClaBots(null)).toBe(false)
  })

  it('returns false for empty workflow dir', () => {
    expect(detectDcoClaBots({ entries: [] })).toBe(false)
  })

  it('detects probot/dco', () => {
    const dir = {
      entries: [
        { name: 'dco.yml', object: { text: 'uses: probot/dco' } },
      ],
    }
    expect(detectDcoClaBots(dir)).toBe(true)
  })

  it('detects contributor-assistant/github-action', () => {
    const dir = {
      entries: [
        { name: 'cla.yml', object: { text: 'uses: contributor-assistant/github-action@v2' } },
      ],
    }
    expect(detectDcoClaBots(dir)).toBe(true)
  })

  it('detects apps/dco', () => {
    const dir = {
      entries: [
        { name: 'check.yml', object: { text: 'uses: apps/dco' } },
      ],
    }
    expect(detectDcoClaBots(dir)).toBe(true)
  })

  it('returns false when no known bots found', () => {
    const dir = {
      entries: [
        { name: 'ci.yml', object: { text: 'name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest' } },
      ],
    }
    expect(detectDcoClaBots(dir)).toBe(false)
  })

  it('handles entries with null text', () => {
    const dir = {
      entries: [
        { name: 'binary.yml', object: null },
      ],
    }
    expect(detectDcoClaBots(dir)).toBe(false)
  })
})
