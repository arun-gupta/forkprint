import { describe, expect, it } from 'vitest'
import {
  buildResponsivenessMetricsForWindow,
  createUnavailableResponsivenessResponse,
  mergeResponsivenessData,
} from './extract-responsiveness'
import type { ActivityWindowMetrics } from './analysis-result'

const EMPTY_ACTIVITY_METRICS: ActivityWindowMetrics = {
  commits: 0,
  prsOpened: 0,
  prsMerged: 0,
  issuesOpened: 0,
  issuesClosed: 0,
  releases: 0,
  staleIssueRatio: 'unavailable',
  medianTimeToMergeHours: 'unavailable',
  medianTimeToCloseHours: 'unavailable',
}

describe('createUnavailableResponsivenessResponse', () => {
  it('returns empty node arrays with zero stale counts', () => {
    const resp = createUnavailableResponsivenessResponse()
    expect(resp.recentCreatedIssues.nodes).toHaveLength(0)
    expect(resp.staleOpenPullRequests30.issueCount).toBe(0)
    expect(resp.staleOpenPullRequests365.issueCount).toBe(0)
  })
})

describe('mergeResponsivenessData', () => {
  it('uses metadata when detail map is empty', () => {
    const metadata = {
      recentCreatedIssues: {
        nodes: [{ id: 'i1', createdAt: '2024-01-01T00:00:00Z', author: { login: 'user' }, comments: { totalCount: 0 } }],
      },
      recentClosedIssues: { nodes: [] },
      recentCreatedPullRequests: { nodes: [] },
      recentMergedPullRequests: { nodes: [] },
      staleOpenPullRequests30: { issueCount: 0 },
      staleOpenPullRequests60: { issueCount: 0 },
      staleOpenPullRequests90: { issueCount: 0 },
      staleOpenPullRequests180: { issueCount: 0 },
      staleOpenPullRequests365: { issueCount: 0 },
    }
    const result = mergeResponsivenessData(metadata, new Map())
    expect(result.recentCreatedIssues.nodes).toHaveLength(1)
    expect(result.recentCreatedIssues.nodes[0]!.createdAt).toBe('2024-01-01T00:00:00Z')
  })

  it('enriches nodes from detail map', () => {
    const metadata = {
      recentCreatedIssues: {
        nodes: [{ id: 'i1', createdAt: '2024-01-01T00:00:00Z', author: { login: 'user' }, comments: { totalCount: 1 } }],
      },
      recentClosedIssues: { nodes: [] },
      recentCreatedPullRequests: { nodes: [] },
      recentMergedPullRequests: { nodes: [] },
      staleOpenPullRequests30: { issueCount: 0 },
      staleOpenPullRequests60: { issueCount: 0 },
      staleOpenPullRequests90: { issueCount: 0 },
      staleOpenPullRequests180: { issueCount: 0 },
      staleOpenPullRequests365: { issueCount: 0 },
    }
    const detailMap = new Map([
      ['i1', {
        id: 'i1',
        createdAt: '2024-01-01T00:00:00Z',
        author: { login: 'user' },
        comments: {
          totalCount: 1,
          nodes: [{ createdAt: '2024-01-01T01:00:00Z', author: { login: 'responder' } }],
        },
      }],
    ])
    const result = mergeResponsivenessData(metadata, detailMap)
    expect(result.recentCreatedIssues.nodes[0]!.comments.nodes).toHaveLength(1)
  })
})

describe('buildResponsivenessMetricsForWindow', () => {
  it('returns unavailable for all duration metrics when no nodes', () => {
    const metrics = buildResponsivenessMetricsForWindow(
      90,
      [],
      [],
      [],
      [],
      EMPTY_ACTIVITY_METRICS,
      undefined,
      undefined,
      undefined,
    )
    expect(metrics.issueFirstResponseMedianHours).toBe('unavailable')
    expect(metrics.prMergeMedianHours).toBe('unavailable')
    expect(metrics.issueResolutionMedianHours).toBe('unavailable')
  })

  it('computes correct issue first response median', () => {
    const now = Date.now()
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString()
    const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString()
    const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000).toISOString()
    const threeHoursAgo = new Date(now - 3 * 60 * 60 * 1000).toISOString()
    const issues = [
      {
        createdAt: fourHoursAgo,
        author: { login: 'opener' },
        comments: { totalCount: 1, nodes: [{ createdAt: threeHoursAgo, author: { login: 'responder' } }] },
      },
      {
        createdAt: twoHoursAgo,
        author: { login: 'opener' },
        comments: { totalCount: 1, nodes: [{ createdAt: oneHourAgo, author: { login: 'responder' } }] },
      },
    ]
    const metrics = buildResponsivenessMetricsForWindow(
      90,
      issues,
      [],
      [],
      [],
      EMPTY_ACTIVITY_METRICS,
      undefined,
      undefined,
      undefined,
    )
    expect(typeof metrics.issueFirstResponseMedianHours).toBe('number')
    expect(metrics.issueFirstResponseMedianHours as number).toBeCloseTo(1, 0)
  })

  it('computes stale PR ratio', () => {
    const metrics = buildResponsivenessMetricsForWindow(
      90,
      [],
      [],
      [],
      [],
      EMPTY_ACTIVITY_METRICS,
      5,
      undefined,
      20,
    )
    expect(metrics.stalePrRatio).toBe(0.25)
  })

  it('returns correct openIssueCount and openPullRequestCount', () => {
    const metrics = buildResponsivenessMetricsForWindow(
      90,
      [],
      [],
      [],
      [],
      EMPTY_ACTIVITY_METRICS,
      undefined,
      42,
      17,
    )
    expect(metrics.openIssueCount).toBe(42)
    expect(metrics.openPullRequestCount).toBe(17)
  })
})
