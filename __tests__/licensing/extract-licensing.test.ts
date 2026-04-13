import { describe, expect, it } from 'vitest'
import { extractLicensingResult, computeSignedOffByRatio, detectDcoClaBots, parseSpdxExpression, detectLicenseFiles } from '@/lib/analyzer/extract-licensing'

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

describe('parseSpdxExpression', () => {
  it('parses "MIT OR Apache-2.0" expression', () => {
    const ids = parseSpdxExpression('Licensed under MIT OR Apache-2.0', null)
    expect(ids).toContain('MIT')
    expect(ids).toContain('Apache-2.0')
  })

  it('parses parenthesized expression "(MIT OR Apache-2.0)"', () => {
    const ids = parseSpdxExpression('This software is (MIT OR Apache-2.0)', null)
    expect(ids).toContain('MIT')
    expect(ids).toContain('Apache-2.0')
  })

  it('excludes the primary SPDX ID', () => {
    const ids = parseSpdxExpression('MIT OR Apache-2.0', 'Apache-2.0')
    expect(ids).toContain('MIT')
    expect(ids).not.toContain('Apache-2.0')
  })

  it('returns empty for non-SPDX content', () => {
    const ids = parseSpdxExpression('This is a regular LICENSE file with no SPDX expressions', null)
    expect(ids).toEqual([])
  })

  it('ignores unknown SPDX IDs', () => {
    const ids = parseSpdxExpression('FAKE-LICENSE OR MIT', null)
    expect(ids).toContain('MIT')
    expect(ids).not.toContain('FAKE-LICENSE')
  })

  it('handles multiple OR expressions', () => {
    const ids = parseSpdxExpression('MIT OR Apache-2.0\nBSD-2-Clause OR ISC', null)
    expect(ids).toContain('MIT')
    expect(ids).toContain('Apache-2.0')
    expect(ids).toContain('BSD-2-Clause')
    expect(ids).toContain('ISC')
  })
})

describe('detectLicenseFiles', () => {
  it('detects LICENSE-MIT file', () => {
    const files = [{ suffix: 'MIT', content: 'MIT License text...' }]
    const detections = detectLicenseFiles(files, null)
    expect(detections).toHaveLength(1)
    expect(detections[0].spdxId).toBe('MIT')
    expect(detections[0].osiApproved).toBe(true)
    expect(detections[0].permissivenessTier).toBe('Permissive')
  })

  it('detects LICENSE-APACHE file', () => {
    const files = [{ suffix: 'APACHE', content: 'Apache License 2.0 text...' }]
    const detections = detectLicenseFiles(files, null)
    expect(detections).toHaveLength(1)
    expect(detections[0].spdxId).toBe('Apache-2.0')
  })

  it('skips files with null content', () => {
    const files = [{ suffix: 'MIT', content: null }]
    const detections = detectLicenseFiles(files, null)
    expect(detections).toHaveLength(0)
  })

  it('skips files matching the primary SPDX ID', () => {
    const files = [{ suffix: 'MIT', content: 'MIT License text...' }]
    const detections = detectLicenseFiles(files, 'MIT')
    expect(detections).toHaveLength(0)
  })

  it('detects multiple additional license files', () => {
    const files = [
      { suffix: 'MIT', content: 'MIT License text...' },
      { suffix: 'APACHE', content: 'Apache License text...' },
    ]
    const detections = detectLicenseFiles(files, null)
    expect(detections).toHaveLength(2)
    expect(detections.map((d) => d.spdxId)).toEqual(['MIT', 'Apache-2.0'])
  })

  it('ignores unknown license file suffixes', () => {
    const files = [{ suffix: 'CUSTOM', content: 'Custom license...' }]
    const detections = detectLicenseFiles(files, null)
    expect(detections).toHaveLength(0)
  })
})

describe('extractLicensingResult dual-license integration', () => {
  it('detects dual license from SPDX expression in LICENSE content', () => {
    const result = extractLicensingResult(
      { spdxId: 'Apache-2.0', name: 'Apache License 2.0' },
      [],
      null,
      'Licensed under the Apache License, Version 2.0 OR MIT',
    )

    expect(result.license.spdxId).toBe('Apache-2.0')
    expect(result.additionalLicenses).toHaveLength(1)
    expect(result.additionalLicenses[0].spdxId).toBe('MIT')
    expect(result.additionalLicenses[0].osiApproved).toBe(true)
    expect(result.additionalLicenses[0].permissivenessTier).toBe('Permissive')
  })

  it('detects dual license from separate license files', () => {
    const result = extractLicensingResult(
      { spdxId: 'Apache-2.0', name: 'Apache License 2.0' },
      [],
      null,
      null,
      [{ suffix: 'MIT', content: 'MIT License text...' }],
    )

    expect(result.additionalLicenses).toHaveLength(1)
    expect(result.additionalLicenses[0].spdxId).toBe('MIT')
  })

  it('deduplicates licenses found from both expression and files', () => {
    const result = extractLicensingResult(
      { spdxId: 'Apache-2.0', name: 'Apache License 2.0' },
      [],
      null,
      'MIT OR Apache-2.0',
      [{ suffix: 'MIT', content: 'MIT License text...' }],
    )

    // MIT should appear only once despite being found in both expression and file
    expect(result.additionalLicenses).toHaveLength(1)
    expect(result.additionalLicenses[0].spdxId).toBe('MIT')
  })

  it('returns empty additionalLicenses when no dual licensing detected', () => {
    const result = extractLicensingResult(
      { spdxId: 'MIT', name: 'MIT License' },
      [],
      null,
      'MIT License\n\nPermission is hereby granted...',
    )

    expect(result.additionalLicenses).toHaveLength(0)
  })
})
