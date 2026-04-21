import { describe, expect, it } from 'vitest'
import type { AnalysisResult, DocumentationFileCheck } from '@/lib/analyzer/analysis-result'
import { computeTabTagCounts } from './tab-counts'

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  const base: Partial<AnalysisResult> = {
    repo: 'owner/repo',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    securityResult: 'unavailable',
    inclusiveNamingResult: 'unavailable',
    hasFundingConfig: 'unavailable',
    hasDiscussionsEnabled: 'unavailable',
  }
  return { ...base, ...overrides } as AnalysisResult
}

const ALL_DOC_FILES: DocumentationFileCheck[] = [
  { name: 'readme', found: true, path: 'README.md' },
  { name: 'license', found: true, path: 'LICENSE' },
  { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
  { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
  { name: 'security', found: true, path: 'SECURITY.md' },
  { name: 'changelog', found: true, path: 'CHANGELOG.md' },
  { name: 'issue_templates', found: true, path: '.github/ISSUE_TEMPLATE/' },
  { name: 'pull_request_template', found: true, path: '.github/PULL_REQUEST_TEMPLATE.md' },
  { name: 'governance', found: true, path: 'GOVERNANCE.md' },
]

const ALL_README_SECTIONS = [
  { name: 'description', detected: true },
  { name: 'installation', detected: true },
  { name: 'usage', detected: true },
  { name: 'contributing', detected: true },
  { name: 'license', detected: true },
] as const

const FULL_LICENSING = {
  license: { spdxId: 'MIT', name: 'MIT', osiApproved: true, permissivenessTier: 'Permissive' as const },
  additionalLicenses: [],
  contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
}

describe('computeTabTagCounts', () => {
  it('returns empty object when tag is null or no results', () => {
    expect(computeTabTagCounts([], null)).toEqual({})
    expect(computeTabTagCounts([makeResult()], null)).toEqual({})
    expect(computeTabTagCounts([], 'community')).toEqual({})
  })

  it('counts community signals across documentation, contributors, activity', () => {
    const result = makeResult({
      documentationResult: { fileChecks: ALL_DOC_FILES, readmeSections: [...ALL_README_SECTIONS], readmeContent: null },
      licensingResult: FULL_LICENSING,
      hasFundingConfig: true,
      hasDiscussionsEnabled: true,
    })
    const counts = computeTabTagCounts([result], 'community')
    // COMMUNITY_DOC_FILES = code_of_conduct, issue_templates, pull_request_template, governance (4)
    expect(counts.documentation).toBe(4)
    // COMMUNITY_CONTRIBUTORS_METRICS = Maintainer count, Funding disclosure (2)
    expect(counts.contributors).toBe(2)
    // Discussions card adds 1 when hasDiscussionsEnabled is verifiable
    expect(counts.activity).toBe(1)
    expect(counts.security).toBe(0)
    expect(counts.responsiveness).toBe(0)
  })

  it('counts governance signals across documentation, contributors, security', () => {
    const result = makeResult({
      documentationResult: { fileChecks: ALL_DOC_FILES, readmeSections: [...ALL_README_SECTIONS], readmeContent: null },
      licensingResult: FULL_LICENSING,
      securityResult: {
        scorecard: {
          overallScore: 7.5,
          scorecardVersion: 'v4',
          checks: [
            { name: 'Branch-Protection', score: 5, reason: '' },
            { name: 'Code-Review', score: 8, reason: '' },
            { name: 'Security-Policy', score: 10, reason: '' },
            { name: 'License', score: 10, reason: '' },
            { name: 'CI-Tests', score: 5, reason: '' }, // not governance
          ],
        },
        directChecks: [
          { name: 'security_policy', detected: true, details: null },
          { name: 'branch_protection', detected: true, details: null },
          { name: 'dependabot', detected: true, details: null }, // not governance
          { name: 'ci_cd', detected: true, details: null }, // not governance
        ],
        branchProtectionEnabled: true,
      },
    })
    const counts = computeTabTagCounts([result], 'governance')
    // GOVERNANCE_DOC_FILES (license, contributing, code_of_conduct, security, changelog, governance) = 6
    // + licensing pane = 1 → 7
    expect(counts.documentation).toBe(7)
    // GOVERNANCE_CONTRIBUTORS_METRICS = Maintainer count → 1
    expect(counts.contributors).toBe(1)
    // 4 scorecard + 2 direct = 6
    expect(counts.security).toBe(6)
    expect(counts.activity).toBe(0)
    expect(counts.responsiveness).toBe(0)
  })

  it('counts contrib-ex signals across documentation, activity, responsiveness', () => {
    const result = makeResult({
      documentationResult: { fileChecks: ALL_DOC_FILES, readmeSections: [...ALL_README_SECTIONS], readmeContent: null },
    })
    const counts = computeTabTagCounts([result], 'contrib-ex')
    // CONTRIB_EX_DOC_FILES (readme, contributing, code_of_conduct) = 3
    // CONTRIB_EX_README_SECTIONS (description, installation, usage, contributing, license) = 5 → doc total 8
    expect(counts.documentation).toBe(8)
    // CONTRIB_EX_ACTIVITY_CARDS = Issues → 1
    expect(counts.activity).toBe(1)
    // CONTRIB_EX_RESPONSIVENESS_PANES = Issue & PR response time → 1
    expect(counts.responsiveness).toBe(1)
  })

  it('produces zero counts when all relevant data is missing', () => {
    const counts = computeTabTagCounts([makeResult()], 'community')
    expect(counts.documentation).toBe(0)
    // Maintainer count is always counted (it's always rendered as a metric row),
    // even when underlying data is unavailable — so contributors count includes it.
    expect(counts.contributors).toBe(1)
    expect(counts.activity).toBe(0)
    expect(counts.security).toBe(0)
    expect(counts.responsiveness).toBe(0)
  })

  it('counts onboarding signals across documentation and contributors tabs', () => {
    const result = makeResult({
      documentationResult: { fileChecks: ALL_DOC_FILES, readmeSections: [...ALL_README_SECTIONS], readmeContent: null },
      goodFirstIssueCount: 3,
      devEnvironmentSetup: true,
      newContributorPRAcceptanceRate: 0.8,
    })
    const counts = computeTabTagCounts([result], 'onboarding')
    // ONBOARDING_DOC_FILES = issue_templates, pull_request_template, contributing, code_of_conduct (4)
    expect(counts.documentation).toBeGreaterThanOrEqual(4)
    // ONBOARDING_README_SECTIONS = installation, contributing (2)
    // total doc = 6
    expect(counts.documentation).toBe(6)
    // ONBOARDING_CONTRIBUTORS_METRICS = Good first issues, Dev environment setup, New contributor PR acceptance (3)
    expect(counts.contributors).toBe(3)
    expect(counts.activity).toBe(0)
    expect(counts.security).toBe(0)
  })

  it('sums counts across multiple repos', () => {
    const r1 = makeResult({
      documentationResult: { fileChecks: ALL_DOC_FILES, readmeSections: [], readmeContent: null },
      hasDiscussionsEnabled: true,
    })
    const r2 = makeResult({
      documentationResult: { fileChecks: ALL_DOC_FILES, readmeSections: [], readmeContent: null },
      hasDiscussionsEnabled: false,
    })
    const counts = computeTabTagCounts([r1, r2], 'community')
    expect(counts.documentation).toBe(8) // 4 per repo
    expect(counts.activity).toBe(2) // discussions card per repo
  })
})
