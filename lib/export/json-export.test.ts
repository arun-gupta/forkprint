import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildJsonExport, triggerDownload } from './json-export'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'

const MINIMAL_RESPONSE: AnalyzeResponse = {
  results: [
    {
      repo: 'facebook/react',
      name: 'react',
      description: 'A JavaScript library',
      createdAt: '2013-05-24T16:15:54Z',
      primaryLanguage: 'JavaScript',
      stars: 230000,
      forks: 47000,
      watchers: 6700,
      commits30d: 20,
      commits90d: 60,
      releases12mo: 10,
      prsOpened90d: 40,
      prsMerged90d: 35,
      issuesOpen: 800,
      issuesClosed90d: 120,
      uniqueCommitAuthors90d: 18,
      totalContributors: 1700,
      maintainerCount: 'unavailable',
      commitCountsByAuthor: { alice: 30, bob: 20, carol: 10 },
      commitCountsByExperimentalOrg: {},
      experimentalAttributedAuthors90d: 3,
      experimentalUnattributedAuthors90d: 15,
      issueFirstResponseTimestamps: [],
      issueCloseTimestamps: [],
      prMergeTimestamps: [],
      documentationResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    securityResult: 'unavailable',
    missingFields: [],
    },
  ],
  failures: [],
  rateLimit: { limit: 5000, remaining: 4000, resetAt: '2026-04-06T20:00:00Z', retryAfter: 'unavailable' },
}

describe('buildJsonExport', () => {
  it('returns a Blob with MIME type application/json', () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    expect(result.blob.type).toBe('application/json')
  })

  it('filename matches repopulse-YYYY-MM-DD-HHmmss.json pattern', () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    expect(result.filename).toMatch(/^repopulse-\d{4}-\d{2}-\d{2}-\d{6}\.json$/)
  })

  it('blob content round-trips to the original AnalyzeResponse', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as AnalyzeResponse
    expect(parsed.results[0].repo).toBe('facebook/react')
    expect(parsed.results[0].stars).toBe(230000)
    expect(parsed.rateLimit?.remaining).toBe(4000)
  })

  it('includes computed contributor metrics for each repo', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ contributors: { contributorsScore: string; contributorsMetrics: Array<{ label: string; value: string }>; experimentalMetrics: Array<{ label: string; value: string }> } }> }
    const contributors = parsed.results[0].contributors
    expect(contributors).toBeDefined()
    expect(contributors.contributorsScore).toBeDefined()
    expect(contributors.contributorsMetrics.some((m) => m.label === 'Top 20% contributor share')).toBe(true)
    expect(contributors.experimentalMetrics.some((m) => m.label === 'Elephant Factor')).toBe(true)
    expect(contributors.experimentalMetrics.some((m) => m.label === 'Single-vendor dependency ratio')).toBe(true)
  })

  it('includes computed scores for each repo', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ scores: { activity: { value: string }; contributors: { value: string }; responsiveness: { value: string } } }> }
    const scores = parsed.results[0].scores
    expect(scores).toBeDefined()
    expect(scores.activity).toHaveProperty('value')
    expect(scores.activity).toHaveProperty('tone')
    expect(scores.activity).toHaveProperty('description')
    expect(scores.contributors).toHaveProperty('value')
    expect(scores.responsiveness).toHaveProperty('value')
  })

  it('includes computed health ratios for each repo', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ healthRatios: Array<{ id: string; category: string; label: string; displayValue: string }> }> }
    const healthRatios = parsed.results[0].healthRatios
    expect(healthRatios).toBeDefined()
    expect(healthRatios.length).toBeGreaterThan(0)
    expect(healthRatios.some((r) => r.id === 'fork-rate')).toBe(true)
    expect(healthRatios.every((r) => r.category && r.label && r.displayValue !== undefined)).toBe(true)
  })

  it('preserves "unavailable" string values verbatim', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    expect(text).toContain('"unavailable"')
  })

  it('omits comparison key for a single repo', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { comparison?: unknown }
    expect(parsed.comparison).toBeUndefined()
  })

  it('includes comparison data when 2+ repos are analyzed', async () => {
    const multiResponse: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [
        { ...MINIMAL_RESPONSE.results[0] },
        { ...MINIMAL_RESPONSE.results[0], repo: 'vercel/next.js', name: 'next.js' },
      ],
    }
    const result = buildJsonExport(multiResponse)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { comparison: Array<{ id: string; label: string; rows: Array<{ attributeId: string; label: string; medianDisplay: string; cells: Array<{ repo: string; displayValue: string; status: string }> }> }> }
    expect(parsed.comparison).toBeDefined()
    expect(parsed.comparison.length).toBeGreaterThan(0)
    const overviewSection = parsed.comparison.find((s) => s.id === 'overview')
    expect(overviewSection).toBeDefined()
    const starsRow = overviewSection!.rows.find((r) => r.attributeId === 'stars')
    expect(starsRow).toBeDefined()
    expect(starsRow!.medianDisplay).toBeDefined()
    expect(starsRow!.cells).toHaveLength(2)
    expect(starsRow!.cells[0].repo).toBe('facebook/react')
    expect(starsRow!.cells[0].status).toBe('neutral')
    expect(starsRow!.cells[1].repo).toBe('vercel/next.js')
  })

  it('includes community data with seven signal keys and nested discussions/completeness', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as {
      results: Array<{
        community: {
          signals: Record<string, { present: boolean | 'unknown' }>
          completeness: { ratio: number | null; percentile: number | null; tone: string; presentCount: number; missingCount: number; unknownCount: number }
          discussions: { enabled: boolean | 'unknown'; windowDays: number | null; windowCount: number | null }
        }
      }>
    }
    const community = parsed.results[0].community
    expect(community).toBeDefined()
    expect(Object.keys(community.signals).sort()).toEqual([
      'code_of_conduct',
      'codeowners',
      'discussions_enabled',
      'funding',
      'governance',
      'issue_templates',
      'pull_request_template',
    ])
    expect(community.completeness).toHaveProperty('ratio')
    expect(community.completeness).toHaveProperty('percentile')
    expect(community.completeness).toHaveProperty('presentCount')
    expect(community.discussions).toHaveProperty('enabled')
    expect(community.discussions).toHaveProperty('windowDays')
    expect(community.discussions).toHaveProperty('windowCount')
  })

  it('community.discussions has null window fields when Discussions is disabled (FR-008 / SC-003)', async () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [{
        ...MINIMAL_RESPONSE.results[0],
        hasDiscussionsEnabled: false,
        // windowDays/windowCount omitted — analyzer leaves them 'unavailable' when disabled
      }],
    }
    const result = buildJsonExport(response)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ community: { discussions: { enabled: boolean; windowDays: number | null; windowCount: number | null } } }> }
    const discussions = parsed.results[0].community.discussions
    expect(discussions.enabled).toBe(false)
    expect(discussions.windowDays).toBeNull()
    expect(discussions.windowCount).toBeNull()
  })

  it('omits security, licensing, and inclusiveNaming when data is unavailable', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ security?: unknown; licensing?: unknown; inclusiveNaming?: unknown }> }
    expect(parsed.results[0].security).toBeUndefined()
    expect(parsed.results[0].licensing).toBeUndefined()
  })

  it('includes security data when securityResult is present', async () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [{
        ...MINIMAL_RESPONSE.results[0],
        securityResult: {
          scorecard: {
            overallScore: 6.5,
            checks: [{ name: 'Code-Review', score: 7, reason: 'Found' }],
            scorecardVersion: '5.0.0',
          },
          directChecks: [
            { name: 'security_policy', detected: true, details: null },
            { name: 'dependabot', detected: false, details: null },
          ],
          branchProtectionEnabled: true,
        },
      }],
    }
    const result = buildJsonExport(response)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ security: { score: number; mode: string; scorecard: { overallScore: number; checks: Array<{ name: string }> }; directChecks: Array<{ name: string; detected: boolean }> }; scores: { security: { value: number; mode: string } } }> }
    expect(parsed.results[0].security).toBeDefined()
    expect(parsed.results[0].security.mode).toBe('scorecard')
    expect(parsed.results[0].security.scorecard.overallScore).toBe(6.5)
    expect(parsed.results[0].security.scorecard.checks[0].name).toBe('Code-Review')
    expect(parsed.results[0].security.directChecks).toHaveLength(2)
    expect(parsed.results[0].scores.security).toBeDefined()
    expect(parsed.results[0].scores.security.mode).toBe('scorecard')
  })

  it('includes licensing data when licensingResult is present', async () => {
    const response: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [{
        ...MINIMAL_RESPONSE.results[0],
        licensingResult: {
          license: { spdxId: 'Apache-2.0', name: 'Apache License 2.0', osiApproved: true, permissivenessTier: 'Permissive' },
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: 0.5, dcoOrClaBot: true, enforced: true },
        },
      }],
    }
    const result = buildJsonExport(response)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ licensing: { license: { spdxId: string; osiApproved: boolean }; contributorAgreement: { enforced: boolean } } }> }
    expect(parsed.results[0].licensing).toBeDefined()
    expect(parsed.results[0].licensing.license.spdxId).toBe('Apache-2.0')
    expect(parsed.results[0].licensing.license.osiApproved).toBe(true)
    expect(parsed.results[0].licensing.contributorAgreement.enforced).toBe(true)
  })

  it('includes inclusiveNaming data when inclusiveNamingResult is present', async () => {
    const result = buildJsonExport(MINIMAL_RESPONSE)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as { results: Array<{ inclusiveNaming: { branchScore: number; metadataScore: number; branchCheck: { passed: boolean } } }> }
    expect(parsed.results[0].inclusiveNaming).toBeDefined()
    expect(parsed.results[0].inclusiveNaming.branchCheck.passed).toBe(true)
    expect(parsed.results[0].inclusiveNaming.branchScore).toBeDefined()
    expect(parsed.results[0].inclusiveNaming.metadataScore).toBeDefined()
  })

  it('includes all repos when multiple repos are present', async () => {
    const multiResponse: AnalyzeResponse = {
      ...MINIMAL_RESPONSE,
      results: [
        { ...MINIMAL_RESPONSE.results[0] },
        { ...MINIMAL_RESPONSE.results[0], repo: 'vercel/next.js', name: 'next.js' },
      ],
    }
    const result = buildJsonExport(multiResponse)
    const text = await result.blob.text()
    const parsed = JSON.parse(text) as AnalyzeResponse
    expect(parsed.results).toHaveLength(2)
    expect(parsed.results[1].repo).toBe('vercel/next.js')
  })
})

describe('triggerDownload', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
    const anchor = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor as unknown as Node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => anchor as unknown as Node)
  })

  it('calls URL.createObjectURL and revokeObjectURL', () => {
    const blob = new Blob(['{}'], { type: 'application/json' })
    triggerDownload({ blob, filename: 'test.json' })
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
