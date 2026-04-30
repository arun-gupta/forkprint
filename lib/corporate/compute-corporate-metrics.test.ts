import { describe, expect, it } from 'vitest'
import type { AnalysisResult, ActivityWindowMetrics, ContributorWindowMetrics } from '@/lib/analyzer/analysis-result'
import { buildResult } from '@/lib/testing/fixtures'
import { computeCorporateMetrics } from './compute-corporate-metrics'

const WINDOW_DAYS_LIST = [30, 60, 90, 180, 365] as const

function makeActivityWindow(commits: number | 'unavailable'): ActivityWindowMetrics {
  return {
    commits,
    prsOpened: 0,
    prsMerged: 0,
    issuesOpened: 0,
    issuesClosed: 0,
    releases: 0,
    staleIssueRatio: 0,
    medianTimeToMergeHours: 0,
    medianTimeToCloseHours: 0,
  }
}

function makeContributorWindow(overrides: Partial<ContributorWindowMetrics> = {}): ContributorWindowMetrics {
  return {
    uniqueCommitAuthors: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    repeatContributors: 'unavailable',
    newContributors: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors: 'unavailable',
    experimentalUnattributedAuthors: 'unavailable',
    commitAuthorsByExperimentalOrg: {},
    commitCountsByEmailDomain: {},
    commitAuthorsByEmailDomain: {},
    ...overrides,
  }
}

function makeResult(
  repo: string,
  orgHandle: string,
  orgCommits: number,
  orgAuthors: string[],
  emailDomain: string,
  emailCommits: number,
  emailAuthors: string[],
  totalCommits: number | 'unavailable',
): AnalysisResult {
  const contributorWindow = makeContributorWindow({
    commitCountsByExperimentalOrg:
      orgCommits > 0
        ? { [orgHandle]: orgCommits }
        : {},
    commitAuthorsByExperimentalOrg: orgAuthors.length > 0 ? { [orgHandle]: orgAuthors } : {},
    commitCountsByEmailDomain: emailCommits > 0 ? { [emailDomain]: emailCommits } : {},
    commitAuthorsByEmailDomain: emailAuthors.length > 0 ? { [emailDomain]: emailAuthors } : {},
  })
  return buildResult({
    repo,
    activityMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(totalCommits)]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
    contributorMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
  })
}

describe('computeCorporateMetrics — per-repo', () => {
  it('returns zero corporate metrics when no commits match either signal', () => {
    const result = makeResult('owner/repo', 'microsoft', 0, [], 'microsoft.com', 0, [], 100)
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo).toHaveLength(1)
    expect(output.perRepo[0]).toMatchObject({
      repo: 'owner/repo',
      corporateCommits: 0,
      corporateAuthors: 0,
      corporatePct: 0,
    })
  })

  it('counts commits and unique authors from the org signal only', () => {
    const result = makeResult(
      'owner/repo',
      'microsoft',
      3,
      ['login:alice', 'login:bob'],
      'microsoft.com',
      0,
      [],
      10,
    )
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]).toMatchObject({
      corporateCommits: 3,
      corporateAuthors: 2,
      corporatePct: 30,
    })
  })

  it('counts commits and unique authors from the email signal only', () => {
    const result = makeResult('owner/repo', 'microsoft', 0, [], 'microsoft.com', 2, ['email:alice@microsoft.com'], 10)
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]).toMatchObject({
      corporateCommits: 2,
      corporateAuthors: 1,
      corporatePct: 20,
    })
  })

  it('combines org and email signals without double-counting', () => {
    const result = makeResult(
      'owner/repo',
      'microsoft',
      3,
      ['login:alice'],
      'microsoft.com',
      2,
      ['email:bob@microsoft.com'],
      10,
    )
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]).toMatchObject({
      corporateCommits: 5,
      corporateAuthors: 2,
      corporatePct: 50,
    })
  })

  it('uses available email signal when org data is unavailable', () => {
    const contributorWindow = makeContributorWindow({
      commitCountsByExperimentalOrg: 'unavailable',
      commitAuthorsByExperimentalOrg: 'unavailable',
      commitCountsByEmailDomain: { 'microsoft.com': 2 },
      commitAuthorsByEmailDomain: { 'microsoft.com': ['email:alice@microsoft.com'] },
    })
    const result = buildResult({
      repo: 'owner/repo',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]).toMatchObject({
      corporateCommits: 2,
      corporateAuthors: 1,
      corporatePct: 20,
    })
  })

  it('returns unavailable for all columns when both signals are unavailable', () => {
    const contributorWindow = makeContributorWindow({
      commitCountsByExperimentalOrg: 'unavailable',
      commitAuthorsByExperimentalOrg: 'unavailable',
      commitCountsByEmailDomain: 'unavailable',
      commitAuthorsByEmailDomain: 'unavailable',
    })
    const result = buildResult({
      repo: 'owner/repo',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]).toMatchObject({
      corporateCommits: 'unavailable',
      corporateAuthors: 'unavailable',
      corporatePct: 'unavailable',
    })
  })

  it('returns unavailable for corporatePct when total commits are unavailable', () => {
    const result = makeResult('owner/repo', 'microsoft', 3, ['login:alice'], 'microsoft.com', 0, [], 'unavailable')
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]?.corporatePct).toBe('unavailable')
    expect(output.perRepo[0]?.corporateCommits).toBe(3)
  })

  it('selects data from the requested window', () => {
    const contributorWindow30 = makeContributorWindow({
      commitCountsByExperimentalOrg: { microsoft: 2 },
      commitAuthorsByExperimentalOrg: { microsoft: ['login:alice'] },
    })
    const contributorWindow90 = makeContributorWindow({
      commitCountsByExperimentalOrg: { microsoft: 8 },
      commitAuthorsByExperimentalOrg: { microsoft: ['login:alice', 'login:bob'] },
    })
    const windows: Record<number, ContributorWindowMetrics> = {
      30: contributorWindow30,
      60: makeContributorWindow(),
      90: contributorWindow90,
      180: makeContributorWindow(),
      365: makeContributorWindow(),
    }
    const result = buildResult({
      repo: 'owner/repo',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: windows as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })

    const out30 = computeCorporateMetrics([result], 'microsoft', 30)
    const out90 = computeCorporateMetrics([result], 'microsoft', 90)

    expect(out30.perRepo[0]?.corporateCommits).toBe(2)
    expect(out90.perRepo[0]?.corporateCommits).toBe(8)
  })

  it('rounds corporatePct to one decimal place', () => {
    const result = makeResult('owner/repo', 'microsoft', 1, ['login:alice'], 'microsoft.com', 0, [], 3)
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]?.corporatePct).toBe(33.3)
  })

  it('treats undefined org signal fields as unavailable (pre-feature results)', () => {
    // Simulate a result produced before the new fields were added — optional fields absent
    const contributorWindow: ContributorWindowMetrics = {
      uniqueCommitAuthors: 'unavailable',
      commitCountsByAuthor: 'unavailable',
      repeatContributors: 'unavailable',
      newContributors: 'unavailable',
      commitCountsByExperimentalOrg: 'unavailable',
      experimentalAttributedAuthors: 'unavailable',
      experimentalUnattributedAuthors: 'unavailable',
      // commitAuthorsByExperimentalOrg, commitCountsByEmailDomain, commitAuthorsByEmailDomain intentionally absent
    }
    const result = buildResult({
      repo: 'owner/repo',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]).toMatchObject({
      corporateCommits: 'unavailable',
      corporateAuthors: 'unavailable',
      corporatePct: 'unavailable',
    })
  })

  it('returns 0/0/0 when both signals are unavailable but total commits is 0', () => {
    const contributorWindow = makeContributorWindow({
      commitCountsByExperimentalOrg: 'unavailable',
      commitAuthorsByExperimentalOrg: 'unavailable',
      commitCountsByEmailDomain: 'unavailable',
      commitAuthorsByEmailDomain: 'unavailable',
    })
    const result = buildResult({
      repo: 'owner/repo',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(0)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]).toMatchObject({
      corporateCommits: 0,
      corporateAuthors: 0,
      corporatePct: 0,
    })
  })


  it('returns corporateCommits/corporatePct from counts even when author-array field is absent (decoupled)', () => {
    // Simulates an older serialised result: commitCountsByExperimentalOrg is present
    // but commitAuthorsByExperimentalOrg was not collected (field absent).
    // The reviewer wants corporateCommits to be computable while corporateAuthors
    // stays 'unavailable' rather than forcing the entire org signal unavailable.
    const contributorWindow: ContributorWindowMetrics = {
      uniqueCommitAuthors: 'unavailable',
      commitCountsByAuthor: 'unavailable',
      repeatContributors: 'unavailable',
      newContributors: 'unavailable',
      commitCountsByExperimentalOrg: { microsoft: 3 },
      experimentalAttributedAuthors: 'unavailable',
      experimentalUnattributedAuthors: 'unavailable',
      // commitAuthorsByExperimentalOrg absent — older result without author arrays
      // commitCountsByEmailDomain, commitAuthorsByEmailDomain absent
    }
    const result = buildResult({
      repo: 'owner/repo',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.perRepo[0]?.corporateCommits).toBe(3)
    expect(output.perRepo[0]?.corporatePct).toBe(30)
    expect(output.perRepo[0]?.corporateAuthors).toBe('unavailable')
  })


  it('handles a domain-style company name input (strips TLD for orgHandle)', () => {
    const result = makeResult('owner/repo', 'microsoft', 5, ['login:alice'], 'microsoft.com', 0, [], 10)
    const output = computeCorporateMetrics([result], 'microsoft.com', 30)

    expect(output.perRepo[0]?.corporateCommits).toBe(5)
  })

  it('matching is case-insensitive for the company name', () => {
    const result = makeResult('owner/repo', 'microsoft', 5, ['login:alice'], 'microsoft.com', 0, [], 10)
    const output = computeCorporateMetrics([result], 'MICROSOFT', 30)

    expect(output.perRepo[0]?.corporateCommits).toBe(5)
  })
})

describe('computeCorporateMetrics — summary', () => {
  it('sums corporate commits across repos', () => {
    const r1 = makeResult('org/a', 'microsoft', 3, ['login:alice'], 'microsoft.com', 0, [], 10)
    const r2 = makeResult('org/b', 'microsoft', 2, ['login:bob'], 'microsoft.com', 0, [], 10)
    const output = computeCorporateMetrics([r1, r2], 'microsoft', 30)

    expect(output.summary.totalCorporateCommits).toBe(5)
  })

  it('de-duplicates corporate authors across repos', () => {
    const r1 = makeResult('org/a', 'microsoft', 3, ['login:alice', 'login:bob'], 'microsoft.com', 0, [], 10)
    const r2 = makeResult('org/b', 'microsoft', 2, ['login:alice'], 'microsoft.com', 0, [], 10)
    const output = computeCorporateMetrics([r1, r2], 'microsoft', 30)

    expect(output.summary.totalCorporateAuthors).toBe(2)
  })

  it('computes overall corporate % across all repos', () => {
    const r1 = makeResult('org/a', 'microsoft', 5, ['login:alice'], 'microsoft.com', 0, [], 10)
    const r2 = makeResult('org/b', 'microsoft', 5, ['login:bob'], 'microsoft.com', 0, [], 10)
    const output = computeCorporateMetrics([r1, r2], 'microsoft', 30)

    expect(output.summary.overallCorporatePct).toBe(50)
  })

  it('returns unavailable for overallCorporatePct when no repo has available total commits', () => {
    const contributorWindow = makeContributorWindow({
      commitCountsByExperimentalOrg: { microsoft: 3 },
      commitAuthorsByExperimentalOrg: { microsoft: ['login:alice'] },
    })
    const result = buildResult({
      repo: 'org/a',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow('unavailable')]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.summary.overallCorporatePct).toBe('unavailable')
  })

  it('returns unavailable for summary when all repos have unavailable attribution', () => {
    const contributorWindow = makeContributorWindow({
      commitCountsByExperimentalOrg: 'unavailable',
      commitAuthorsByExperimentalOrg: 'unavailable',
      commitCountsByEmailDomain: 'unavailable',
      commitAuthorsByEmailDomain: 'unavailable',
    })
    const result = buildResult({
      repo: 'org/a',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, contributorWindow]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.summary.totalCorporateCommits).toBe('unavailable')
    expect(output.summary.totalCorporateAuthors).toBe('unavailable')
  })


  it('returns zeros for summary when no repo matches the company', () => {
    const result = makeResult('org/a', 'google', 0, [], 'google.com', 0, [], 100)
    const output = computeCorporateMetrics([result], 'microsoft', 30)

    expect(output.summary.totalCorporateCommits).toBe(0)
    expect(output.summary.totalCorporateAuthors).toBe(0)
    expect(output.summary.overallCorporatePct).toBe(0)
  })
})
