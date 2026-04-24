import { describe, it, expect } from 'vitest'
import { evaluateAspirant } from './evaluate'
import type { AnalysisResult, DocumentationResult, LicensingResult, ReleaseHealthResult } from '@/lib/analyzer/analysis-result'
import type { CNCFLandscapeData } from './types'

// ---------------------------------------------------------------------------
// Minimal stubs
// ---------------------------------------------------------------------------

const minimalDoc: DocumentationResult = {
  fileChecks: [
    { name: 'readme', found: true, path: 'README.md' },
    { name: 'license', found: false, path: null },
    { name: 'contributing', found: false, path: null },
    { name: 'code_of_conduct', found: false, path: null },
    { name: 'security', found: false, path: null },
    { name: 'changelog', found: false, path: null },
    { name: 'issue_templates', found: false, path: null },
    { name: 'pull_request_template', found: false, path: null },
    { name: 'governance', found: false, path: null },
  ],
  readmeSections: [
    { name: 'description', detected: false },
    { name: 'installation', detected: false },
    { name: 'usage', detected: false },
    { name: 'contributing', detected: false },
    { name: 'license', detected: false },
  ],
  readmeContent: null,
  adoptersFile: false,
  roadmapFile: false,
  maintainersFile: false,
  cocContent: null,
}

const minimalLicensing: LicensingResult = {
  license: { spdxId: 'Apache-2.0', name: 'Apache License 2.0', osiApproved: true, permissivenessTier: 'Permissive' },
  additionalLicenses: [],
  contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
}

const minimalRelease: ReleaseHealthResult = {
  totalReleasesAnalyzed: 5,
  totalTags: 5,
  releaseFrequency: 5,
  daysSinceLastRelease: 30,
  semverComplianceRatio: 1,
  releaseNotesQualityRatio: 0.8,
  tagToReleaseRatio: 0,
  preReleaseRatio: 0,
  versioningScheme: 'semver',
}

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'test-org/test-repo',
    name: 'test-repo',
    description: 'A test repository',
    createdAt: '2022-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 20,
    watchers: 10,
    commits30d: 5,
    commits90d: 15,
    releases12mo: 5,
    prsOpened90d: 10,
    prsMerged90d: 8,
    issuesOpen: 5,
    issuesClosed90d: 10,
    uniqueCommitAuthors90d: 5,
    totalContributors: 10,
    maintainerCount: 2,
    commitCountsByAuthor: { 'author-a': 50, 'author-b': 30 },
    commitCountsByExperimentalOrg: { 'org-a': 50, 'org-b': 30, 'org-c': 20 },
    experimentalAttributedAuthors90d: 5,
    experimentalUnattributedAuthors90d: 2,
    issueFirstResponseTimestamps: [],
    issueCloseTimestamps: [],
    prMergeTimestamps: [],
    documentationResult: minimalDoc,
    licensingResult: minimalLicensing,
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    ageInDays: 365,
    releaseHealthResult: minimalRelease,
    missingFields: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// T016 — Contributor Diversity (FR-011)
// ---------------------------------------------------------------------------

describe('T016 — contributor-diversity field', () => {
  function getField(result: AnalysisResult) {
    const { autoFields } = evaluateAspirant(result, null)
    const field = autoFields.find((f) => f.id === 'contributor-diversity')
    if (!field) throw new Error('contributor-diversity field not found')
    return field
  }

  it('T016-1: 3 orgs → status ready, evidence mentions "3 orgs"', () => {
    const result = makeResult({
      commitCountsByExperimentalOrg: { 'org-a': 50, 'org-b': 30, 'org-c': 20 },
    })
    const field = getField(result)
    expect(field.status).toBe('ready')
    expect(field.evidence).toContain('3 orgs')
  })

  it('T016-2: single org → status partial, remediationHint mentions "single-vendor"', () => {
    const result = makeResult({
      commitCountsByExperimentalOrg: { 'org-a': 100 },
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/single-vendor/i)
  })

  it('T016-3: 2 orgs → status partial, remediationHint mentions "2 contributor"', () => {
    const result = makeResult({
      commitCountsByExperimentalOrg: { 'org-a': 60, 'org-b': 40 },
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/2 contributor/i)
  })

  it('T016-4: 3 orgs but one dominates >50% → status partial, remediationHint mentions "dominates"', () => {
    const result = makeResult({
      commitCountsByExperimentalOrg: { 'org-a': 80, 'org-b': 10, 'org-c': 10 },
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/dominat/i)
  })

  it('T016-5: unavailable → status partial, remediationHint mentions "could not be verified"', () => {
    const result = makeResult({
      commitCountsByExperimentalOrg: 'unavailable',
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/could not be verified/i)
  })
})

// ---------------------------------------------------------------------------
// T018 — Project Activity (FR-012)
// ---------------------------------------------------------------------------

describe('T018 — project-activity field', () => {
  function getField(result: AnalysisResult) {
    const { autoFields } = evaluateAspirant(result, null)
    const field = autoFields.find((f) => f.id === 'project-activity')
    if (!field) throw new Error('project-activity field not found')
    return field
  }

  function makeRelease(overrides: Partial<ReleaseHealthResult> = {}): ReleaseHealthResult {
    return {
      totalReleasesAnalyzed: 5,
      totalTags: 5,
      releaseFrequency: 5,
      daysSinceLastRelease: 30,
      semverComplianceRatio: 1,
      releaseNotesQualityRatio: 0.8,
      tagToReleaseRatio: 0,
      preReleaseRatio: 0,
      versioningScheme: 'semver',
      ...overrides,
    }
  }

  it('T018-1: 5 releases + 15 commits90d → status ready', () => {
    const result = makeResult({
      commits90d: 15,
      releaseHealthResult: makeRelease({ totalReleasesAnalyzed: 5, totalTags: 5 }),
      ageInDays: 400,
    })
    const field = getField(result)
    expect(field.status).toBe('ready')
  })

  it('T018-2: 10 tags but 0 formal releases + commits → partial, hint mentions "Reloader" or "GitHub Releases"', () => {
    const result = makeResult({
      commits90d: 20,
      releaseHealthResult: makeRelease({ totalReleasesAnalyzed: 0, totalTags: 10 }),
      ageInDays: 400,
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/Reloader|GitHub Releases/i)
  })

  it('T018-3: 2 releases → partial, hint mentions "fewer than 4"', () => {
    const result = makeResult({
      commits90d: 15,
      releaseHealthResult: makeRelease({ totalReleasesAnalyzed: 2, totalTags: 2 }),
      ageInDays: 400,
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/fewer than 4/i)
  })

  it('T018-4: 5 releases but only 5 commits90d → partial, hint mentions "commit"', () => {
    const result = makeResult({
      commits90d: 5,
      releaseHealthResult: makeRelease({ totalReleasesAnalyzed: 5, totalTags: 5 }),
      ageInDays: 400,
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/commit/i)
  })

  it('T018-5: new project (90 days old), 0 releases, 0 tags → partial, hint mentions "release cadence"', () => {
    const result = makeResult({
      commits90d: 20,
      releaseHealthResult: makeRelease({ totalReleasesAnalyzed: 0, totalTags: 0 }),
      ageInDays: 90,
    })
    const field = getField(result)
    expect(field.status).toBe('partial')
    expect(field.remediationHint).toMatch(/release cadence/i)
  })
})

// ---------------------------------------------------------------------------
// T020 — Score boundary cases
// ---------------------------------------------------------------------------

describe('T020 — readinessScore boundary cases', () => {
  it('T020-1: all-missing → readinessScore is 0 or very low', () => {
    const result = makeResult({
      documentationResult: 'unavailable',
      licensingResult: 'unavailable',
      releaseHealthResult: 'unavailable',
      commits90d: 'unavailable',
      commitCountsByExperimentalOrg: 'unavailable',
      ageInDays: 'unavailable',
    })
    const { readinessScore } = evaluateAspirant(result, null)
    // Only adopters (partial, 3.5) and contributor-diversity (unavailable→partial, 7.5) earn points
    expect(readinessScore).toBeLessThanOrEqual(15)
  })

  it('T020-2: repo already in landscape → alreadyInLandscape: true', () => {
    const landscapeData: CNCFLandscapeData = {
      repoUrls: new Set(['https://github.com/test-org/test-repo']),
      homepageUrls: new Set(),
      fetchedAt: Date.now(),
      categories: [],
      projectStatusMap: new Map(),
    }
    const result = makeResult({ repo: 'test-org/test-repo' })
    const { alreadyInLandscape } = evaluateAspirant(result, landscapeData)
    expect(alreadyInLandscape).toBe(true)
  })

  it('T020-3: license + contributing + coc ready, no roadmap/security/maintainers/adopters → score between 30 and 70', () => {
    const doc: DocumentationResult = {
      ...minimalDoc,
      fileChecks: [
        { name: 'readme', found: true, path: 'README.md' },
        { name: 'license', found: true, path: 'LICENSE' },
        { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
        { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
        { name: 'security', found: false, path: null },
        { name: 'changelog', found: false, path: null },
        { name: 'issue_templates', found: false, path: null },
        { name: 'pull_request_template', found: false, path: null },
        { name: 'governance', found: false, path: null },
      ],
      cocContent: 'Contributor Covenant',
      roadmapFile: false,
      maintainersFile: false,
      adoptersFile: false,
    }
    const result = makeResult({
      documentationResult: doc,
      licensingResult: minimalLicensing,
    })
    const { readinessScore } = evaluateAspirant(result, null)
    expect(readinessScore).toBeGreaterThan(30)
    expect(readinessScore).toBeLessThan(70)
  })
})

// ---------------------------------------------------------------------------
// CoC content check — Contributor Covenant detection
// ---------------------------------------------------------------------------

describe('CoC — Contributor Covenant content detection', () => {
  function cocDoc(cocContent: string | null, found = true): DocumentationResult {
    return {
      ...minimalDoc,
      fileChecks: minimalDoc.fileChecks.map((f) =>
        f.name === 'code_of_conduct' ? { ...f, found, path: found ? 'CODE_OF_CONDUCT.md' : null } : f,
      ),
      cocContent,
    }
  }

  it('status ready when cocContent contains "Contributor Covenant" (standard heading)', () => {
    const result = makeResult({ documentationResult: cocDoc('# Contributor Covenant Code of Conduct\n\nVersion 2.1') })
    const { autoFields } = evaluateAspirant(result, null)
    expect(autoFields.find((f) => f.id === 'coc')?.status).toBe('ready')
  })

  it('status ready when cocContent contains contributor-covenant.org URL', () => {
    const result = makeResult({ documentationResult: cocDoc('See https://www.contributor-covenant.org/version/2/1/code_of_conduct.html') })
    const { autoFields } = evaluateAspirant(result, null)
    expect(autoFields.find((f) => f.id === 'coc')?.status).toBe('ready')
  })

  it('status partial when CoC file found but cocContent is null (content unavailable)', () => {
    const result = makeResult({ documentationResult: cocDoc(null) })
    const { autoFields } = evaluateAspirant(result, null)
    expect(autoFields.find((f) => f.id === 'coc')?.status).toBe('partial')
  })

  it('status partial when CoC file found but content does not mention Contributor Covenant', () => {
    const result = makeResult({ documentationResult: cocDoc('Be nice to each other.') })
    const { autoFields } = evaluateAspirant(result, null)
    expect(autoFields.find((f) => f.id === 'coc')?.status).toBe('partial')
  })

  it('status missing when CoC file not found', () => {
    const result = makeResult({ documentationResult: cocDoc(null, false) })
    const { autoFields } = evaluateAspirant(result, null)
    expect(autoFields.find((f) => f.id === 'coc')?.status).toBe('missing')
  })
})

// ---------------------------------------------------------------------------
// T030 — alreadyInLandscape flag
// ---------------------------------------------------------------------------

describe('T030 — alreadyInLandscape flag', () => {
  it('T030-1: repo in landscape Set → alreadyInLandscape: true', () => {
    const landscapeData: CNCFLandscapeData = {
      repoUrls: new Set(['https://github.com/test-org/test-repo']),
      homepageUrls: new Set(),
      fetchedAt: Date.now(),
      categories: [],
      projectStatusMap: new Map(),
    }
    const result = makeResult({ repo: 'test-org/test-repo' })
    const { alreadyInLandscape } = evaluateAspirant(result, landscapeData)
    expect(alreadyInLandscape).toBe(true)
  })

  it('T030-2: landscape is null → alreadyInLandscape: false', () => {
    const result = makeResult({ repo: 'test-org/test-repo' })
    const { alreadyInLandscape } = evaluateAspirant(result, null)
    expect(alreadyInLandscape).toBe(false)
  })
})
