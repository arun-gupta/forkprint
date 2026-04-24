import { describe, expect, it } from 'vitest'
import {
  buildActivityCadenceByWindow,
  buildActivityMetricsByWindow,
  buildUnavailableActivityCounts,
} from './extract-activity'
import type { RepoActivityResponse } from './types'

function makeActivity(overrides: Partial<RepoActivityResponse> = {}): RepoActivityResponse {
  return {
    repository: null,
    prsOpened30: { issueCount: 0 },
    prsOpened60: { issueCount: 0 },
    prsOpened90: { issueCount: 0 },
    prsOpened180: { issueCount: 0 },
    prsOpened365: { issueCount: 0 },
    prsMerged30: { issueCount: 0 },
    prsMerged60: { issueCount: 0 },
    prsMerged90: { issueCount: 0 },
    prsMerged180: { issueCount: 0 },
    prsMerged365: { issueCount: 0 },
    issuesOpened30: { issueCount: 0 },
    issuesOpened60: { issueCount: 0 },
    issuesOpened90: { issueCount: 0 },
    issuesOpened180: { issueCount: 0 },
    issuesOpened365: { issueCount: 0 },
    issuesClosed30: { issueCount: 0 },
    issuesClosed60: { issueCount: 0 },
    issuesClosed90: { issueCount: 0 },
    issuesClosed180: { issueCount: 0 },
    issuesClosed365: { issueCount: 0 },
    staleIssues30: { issueCount: 0 },
    staleIssues60: { issueCount: 0 },
    staleIssues90: { issueCount: 0 },
    staleIssues180: { issueCount: 0 },
    staleIssues365: { issueCount: 0 },
    recentMergedPullRequests: { nodes: [] },
    recentClosedIssues: { nodes: [] },
    ...overrides,
  } as unknown as RepoActivityResponse
}

describe('buildUnavailableActivityCounts', () => {
  it('returns zero issueCount for all windows', () => {
    const counts = buildUnavailableActivityCounts()
    expect(counts.prsOpened30.issueCount).toBe(0)
    expect(counts.prsOpened365.issueCount).toBe(0)
    expect(counts.recentMergedPullRequests.nodes).toHaveLength(0)
  })

  it('includes all expected count fields', () => {
    const counts = buildUnavailableActivityCounts()
    expect(counts).toHaveProperty('prsOpened30')
    expect(counts).toHaveProperty('prsMerged365')
    expect(counts).toHaveProperty('staleIssues90')
    expect(counts).toHaveProperty('goodFirstIssues')
  })
})

describe('buildActivityCadenceByWindow', () => {
  it('returns undefined when commitTimestamps is unavailable', () => {
    expect(buildActivityCadenceByWindow('unavailable', new Date())).toBeUndefined()
  })

  it('returns cadence metrics for all windows when timestamps provided', () => {
    const now = new Date()
    const timestamps = [
      new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    ]
    const result = buildActivityCadenceByWindow(timestamps, now)
    expect(result).toBeDefined()
    expect(result![30]).toBeDefined()
    expect(result![90]).toBeDefined()
    expect(result![365]).toBeDefined()
  })
})

describe('buildActivityMetricsByWindow', () => {
  it('returns unavailable for all metrics when activity is empty', () => {
    const result = buildActivityMetricsByWindow(makeActivity(), new Date(), [], undefined)
    expect(result[90].commits).toBe('unavailable')
    expect(result[90].prsOpened).toBe(0)
    expect(result[90].staleIssueRatio).toBe('unavailable')
  })

  it('uses prsOpened90 count from activity data', () => {
    const activity = makeActivity({ prsOpened90: { issueCount: 42 } })
    const result = buildActivityMetricsByWindow(activity, new Date(), [], undefined)
    expect(result[90].prsOpened).toBe(42)
  })

  it('uses commit node count for 365d window', () => {
    const now = new Date()
    const nodes = [
      { authoredDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), author: null },
      { authoredDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), author: null },
    ]
    const result = buildActivityMetricsByWindow(makeActivity(), now, nodes, undefined)
    expect(result[365].commits).toBe(2)
  })

  it('computes stale issue ratio from activity counts', () => {
    const activity = makeActivity({ staleIssues90: { issueCount: 5 } })
    const result = buildActivityMetricsByWindow(activity, new Date(), [], 20)
    expect(result[90].staleIssueRatio).toBe(0.25)
  })

  it('counts releases within each window', () => {
    const now = new Date()
    const recentRelease = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const oldRelease = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString()

    const activity = makeActivity({
      repository: {
        releases: {
          totalCount: 2,
          nodes: [
            { tagName: 'v1.1', name: null, description: null, isPrerelease: false, createdAt: recentRelease, publishedAt: recentRelease },
            { tagName: 'v1.0', name: null, description: null, isPrerelease: false, createdAt: oldRelease, publishedAt: oldRelease },
          ],
        },
        refs: null,
        defaultBranchRef: null,
      },
    } as unknown as Partial<RepoActivityResponse>)

    const result = buildActivityMetricsByWindow(activity, now, [], undefined)
    expect(result[30].releases).toBe(1)
    expect(result[365].releases).toBe(2)
  })
})

