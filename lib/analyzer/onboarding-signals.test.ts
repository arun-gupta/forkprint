import { describe, expect, it } from 'vitest'
import { buildGoodFirstIssueQueries, extractOnboardingSignals } from './analyze'

interface OnboardingPullRequestNode {
  createdAt: string
  mergedAt: string | null
  authorAssociation?: string | null
}

function overviewFixture(overrides: Record<string, unknown>) {
  return {
    name: 'test', description: '', createdAt: '', primaryLanguage: null,
    stargazerCount: 0, forkCount: 0, watchers: { totalCount: 0 },
    issues: { totalCount: 0 },
    ...overrides,
  }
}

function activityFixture(
  mergedPRNodes: OnboardingPullRequestNode[],
  goodFirstIssueCounts?: Partial<Record<'goodFirstIssues' | 'goodFirstIssuesHyphenated' | 'goodFirstIssuesBeginner' | 'goodFirstIssuesStarter', number>>,
){
  return {
    goodFirstIssues: goodFirstIssueCounts?.goodFirstIssues !== undefined ? { issueCount: goodFirstIssueCounts.goodFirstIssues } : undefined,
    goodFirstIssuesHyphenated: goodFirstIssueCounts?.goodFirstIssuesHyphenated !== undefined ? { issueCount: goodFirstIssueCounts.goodFirstIssuesHyphenated } : undefined,
    goodFirstIssuesBeginner: goodFirstIssueCounts?.goodFirstIssuesBeginner !== undefined ? { issueCount: goodFirstIssueCounts.goodFirstIssuesBeginner } : undefined,
    goodFirstIssuesStarter: goodFirstIssueCounts?.goodFirstIssuesStarter !== undefined ? { issueCount: goodFirstIssueCounts.goodFirstIssuesStarter } : undefined,
    recentMergedPullRequests: { nodes: mergedPRNodes },
  }
}

describe('extractOnboardingSignals — devEnvironmentSetup', () => {
  it('true when .devcontainer/ directory has entries', () => {
    const result = extractOnboardingSignals(
      overviewFixture({ onbDevcontainerDir: { entries: [{ name: 'devcontainer.json' }] } }),
      activityFixture([]),
    )
    expect(result.devEnvironmentSetup).toBe(true)
  })

  it('true when .devcontainer.json file present', () => {
    const result = extractOnboardingSignals(
      overviewFixture({ onbDevcontainerJson: { oid: 'abc' } }),
      activityFixture([]),
    )
    expect(result.devEnvironmentSetup).toBe(true)
  })

  it('true when docker-compose.yml present', () => {
    const result = extractOnboardingSignals(
      overviewFixture({ onbDockerComposeYml: { oid: 'abc' } }),
      activityFixture([]),
    )
    expect(result.devEnvironmentSetup).toBe(true)
  })

  it('true when docker-compose.yaml present', () => {
    const result = extractOnboardingSignals(
      overviewFixture({ onbDockerComposeYaml: { oid: 'abc' } }),
      activityFixture([]),
    )
    expect(result.devEnvironmentSetup).toBe(true)
  })

  it('false when all devcontainer/docker-compose probes absent', () => {
    const result = extractOnboardingSignals(overviewFixture({}), activityFixture([]))
    expect(result.devEnvironmentSetup).toBe(false)
  })

  it('false when devcontainer dir is empty (no entries)', () => {
    const result = extractOnboardingSignals(
      overviewFixture({ onbDevcontainerDir: { entries: [] } }),
      activityFixture([]),
    )
    expect(result.devEnvironmentSetup).toBe(false)
  })

  it('returns unavailable when overview repo is null', () => {
    const result = extractOnboardingSignals(null, activityFixture([]))
    expect(result.devEnvironmentSetup).toBe('unavailable')
  })
})

describe('extractOnboardingSignals — gitpodPresent', () => {
  it('true when .gitpod.yml present', () => {
    const result = extractOnboardingSignals(
      overviewFixture({ onbGitpod: { oid: 'abc' } }),
      activityFixture([]),
    )
    expect(result.gitpodPresent).toBe(true)
  })

  it('false when .gitpod.yml absent', () => {
    const result = extractOnboardingSignals(overviewFixture({}), activityFixture([]))
    expect(result.gitpodPresent).toBe(false)
  })

  it('returns unavailable when overview repo is null', () => {
    const result = extractOnboardingSignals(null, activityFixture([]))
    expect(result.gitpodPresent).toBe('unavailable')
  })
})

describe('extractOnboardingSignals — goodFirstIssueCount', () => {
  it('returns count when > 0', () => {
    const result = extractOnboardingSignals(
      overviewFixture({}),
      activityFixture([], { goodFirstIssues: 7 }),
    )
    expect(result.goodFirstIssueCount).toBe(7)
  })

  it('returns 0 when count is 0 (not unavailable)', () => {
    const result = extractOnboardingSignals(overviewFixture({}), activityFixture([], { goodFirstIssues: 0 }))
    expect(result.goodFirstIssueCount).toBe(0)
  })

  it('sums mutually exclusive alternate label counts', () => {
    const result = extractOnboardingSignals(
      overviewFixture({}),
      activityFixture([], {
        goodFirstIssues: 2,
        goodFirstIssuesHyphenated: 3,
        goodFirstIssuesBeginner: 4,
        goodFirstIssuesStarter: 1,
      }),
    )
    expect(result.goodFirstIssueCount).toBe(10)
  })

  it('returns unavailable when goodFirstIssues field is missing from activity', () => {
    const result = extractOnboardingSignals(overviewFixture({}), activityFixture([]))
    expect(result.goodFirstIssueCount).toBe('unavailable')
  })

  it('returns unavailable when activity is null', () => {
    const result = extractOnboardingSignals(overviewFixture({}), null)
    expect(result.goodFirstIssueCount).toBe('unavailable')
  })
})

describe('extractOnboardingSignals — newContributorPRAcceptanceRate', () => {
  const firstTimeMerged = (n: number) =>
    Array.from({ length: n }, () => ({
      createdAt: '2025-01-01T00:00:00Z',
      mergedAt: '2025-01-02T00:00:00Z',
      authorAssociation: 'FIRST_TIME_CONTRIBUTOR',
    }))

  const otherMerged = (n: number) =>
    Array.from({ length: n }, () => ({
      createdAt: '2025-01-01T00:00:00Z',
      mergedAt: '2025-01-02T00:00:00Z',
      authorAssociation: 'CONTRIBUTOR',
    }))

  it('returns unavailable when total qualifying PRs (first-time merged + first-time unmerged) < 3', () => {
    const result = extractOnboardingSignals(
      overviewFixture({}),
      activityFixture([...firstTimeMerged(2)]),
    )
    expect(result.newContributorPRAcceptanceRate).toBe('unavailable')
  })

  it('returns 1.0 when all qualifying PRs from first-time contributors are merged', () => {
    const result = extractOnboardingSignals(
      overviewFixture({}),
      activityFixture([...firstTimeMerged(5)]),
    )
    expect(result.newContributorPRAcceptanceRate).toBe(1)
  })

  it('returns 0 when 5 first-time PRs but 0 merged', () => {
    // 5 first-time PRs in nodes, all with mergedAt = null
    const nodes = Array.from({ length: 5 }, () => ({
      createdAt: '2025-01-01T00:00:00Z',
      mergedAt: null,
      authorAssociation: 'FIRST_TIME_CONTRIBUTOR',
    }))
    const result = extractOnboardingSignals(overviewFixture({}), activityFixture(nodes))
    expect(result.newContributorPRAcceptanceRate).toBe(0)
  })

  it('ignores non-first-time contributors when computing rate', () => {
    const nodes = [...firstTimeMerged(3), ...otherMerged(10)]
    const result = extractOnboardingSignals(overviewFixture({}), activityFixture(nodes))
    expect(result.newContributorPRAcceptanceRate).toBe(1)
  })

  it('returns unavailable when no recentMergedPullRequests data', () => {
    const result = extractOnboardingSignals(overviewFixture({}), null)
    expect(result.newContributorPRAcceptanceRate).toBe('unavailable')
  })

  it('computes partial rate correctly (3 merged out of 5 first-time)', () => {
    const merged = firstTimeMerged(3)
    const unmerged = Array.from({ length: 2 }, () => ({
      createdAt: '2025-01-01T00:00:00Z',
      mergedAt: null,
      authorAssociation: 'FIRST_TIME_CONTRIBUTOR',
    }))
    const result = extractOnboardingSignals(overviewFixture({}), activityFixture([...merged, ...unmerged]))
    expect(result.newContributorPRAcceptanceRate).toBeCloseTo(3 / 5)
  })
})

describe('buildGoodFirstIssueQueries', () => {
  it('builds mutually exclusive queries for supported onboarding labels', () => {
    const queries = buildGoodFirstIssueQueries('owner/repo')
    expect(queries.goodFirstIssueQuery).toContain('repo:owner/repo')
    expect(queries.goodFirstIssueQuery).toContain('label:"good first issue"')
    expect(queries.goodFirstIssueHyphenatedQuery).toContain('label:"good-first-issue"')
    expect(queries.goodFirstIssueHyphenatedQuery).toContain('-label:"good first issue"')
    expect(queries.goodFirstIssueBeginnerQuery).toContain('label:"beginner"')
    expect(queries.goodFirstIssueBeginnerQuery).toContain('-label:"good-first-issue"')
    expect(queries.goodFirstIssueStarterQuery).toContain('label:"starter"')
    expect(queries.goodFirstIssueStarterQuery).toContain('-label:"beginner"')
    expect(Object.values(queries).join(' ')).not.toContain('help wanted')
  })
})
