import { describe, expect, it } from 'vitest'
import {
  buildContributorMetrics,
  buildEarliestContributionByAuthor,
  buildExperimentalMetricsByWindow,
  createUnavailableContributorWindowMetrics,
  filterCommitNodesByWindow,
  getCommitActorKey,
} from './extract-contributors'
import type { CommitNode } from './types'

function makeCommit(login: string | null, email: string | null, daysAgo: number): CommitNode {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return {
    authoredDate: d.toISOString(),
    author: {
      name: login ?? email ?? 'anon',
      email,
      user: login ? { login } : null,
    },
  }
}

describe('getCommitActorKey', () => {
  it('prefers login over email over name', () => {
    const node = makeCommit('user1', 'user1@example.com', 1)
    expect(getCommitActorKey(node)).toBe('login:user1')
  })

  it('falls back to email when no login', () => {
    const node = makeCommit(null, 'user@example.com', 1)
    expect(getCommitActorKey(node)).toBe('email:user@example.com')
  })

  it('returns null when author is null', () => {
    const node: CommitNode = { authoredDate: new Date().toISOString(), author: null }
    expect(getCommitActorKey(node)).toBeNull()
  })
})

describe('filterCommitNodesByWindow', () => {
  it('keeps nodes within the window', () => {
    const now = new Date()
    const nodes = [makeCommit('user1', null, 5), makeCommit('user2', null, 100)]
    const result = filterCommitNodesByWindow(nodes, now, 30)
    expect(result).toHaveLength(1)
    expect(result[0]!.author?.user?.login).toBe('user1')
  })

  it('returns empty when no nodes are in range', () => {
    const now = new Date()
    const nodes = [makeCommit('user1', null, 200)]
    expect(filterCommitNodesByWindow(nodes, now, 90)).toHaveLength(0)
  })
})

describe('buildEarliestContributionByAuthor', () => {
  it('returns unavailable for empty array', () => {
    expect(buildEarliestContributionByAuthor([])).toBe('unavailable')
  })

  it('tracks earliest contribution per author', () => {
    const now = new Date()
    const d10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const d5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const nodes: CommitNode[] = [
      { authoredDate: d10, author: { name: 'alice', email: null, user: { login: 'alice' } } },
      { authoredDate: d5, author: { name: 'alice', email: null, user: { login: 'alice' } } },
    ]
    const result = buildEarliestContributionByAuthor(nodes)
    expect(result).not.toBe('unavailable')
    const map = result as Map<string, number>
    expect(map.get('login:alice')).toBe(Date.parse(d10))
  })
})

describe('buildContributorMetrics', () => {
  it('returns zero counts for empty nodes', () => {
    const metrics = buildContributorMetrics([], 'unavailable', new Date(), 90)
    expect(metrics.uniqueCommitAuthors).toBe(0)
    expect(metrics.commitCountsByAuthor).toEqual({})
    expect(metrics.repeatContributors).toBe(0)
    expect(metrics.newContributors).toBe(0)
  })

  it('counts unique authors and repeat contributors', () => {
    const now = new Date()
    const nodes = [
      makeCommit('alice', null, 5),
      makeCommit('alice', null, 4),
      makeCommit('bob', null, 3),
    ]
    const earliest = buildEarliestContributionByAuthor(nodes)
    const metrics = buildContributorMetrics(nodes, earliest, now, 90)
    expect(metrics.uniqueCommitAuthors).toBe(2)
    expect(metrics.repeatContributors).toBe(1)
  })

  it('identifies new contributors', () => {
    const now = new Date()
    const nodes = [
      makeCommit('alice', null, 5),  // within 30d window
      makeCommit('bob', null, 60),   // outside 30d window
    ]
    const allNodes = [...nodes, makeCommit('bob', null, 60)]
    const earliest = buildEarliestContributionByAuthor(allNodes)
    const metrics = buildContributorMetrics(nodes, earliest, now, 30)
    // alice's first contribution is within window → new contributor
    expect(metrics.newContributors).toBeGreaterThanOrEqual(1)
  })
})

describe('createUnavailableContributorWindowMetrics', () => {
  it('returns unavailable for all window sizes', () => {
    const result = createUnavailableContributorWindowMetrics()
    for (const windowDays of [30, 60, 90, 180, 365]) {
      expect(result[windowDays as 30 | 60 | 90 | 180 | 365].uniqueCommitAuthors).toBe('unavailable')
    }
  })
})

describe('buildExperimentalMetricsByWindow', () => {
  it('returns unavailable when no nodes', () => {
    const result = buildExperimentalMetricsByWindow([], new Map(), new Date())
    expect(result[90].commitCountsByExperimentalOrg).toBe('unavailable')
  })

  it('attributes commits to organizations', () => {
    const now = new Date()
    const nodes = [makeCommit('alice', null, 5)]
    const orgs = new Map([['alice', ['CNCF']]])
    const result = buildExperimentalMetricsByWindow(nodes, orgs, now)
    const w90 = result[90]
    expect(w90.commitCountsByExperimentalOrg).not.toBe('unavailable')
    const orgCounts = w90.commitCountsByExperimentalOrg as Record<string, number>
    expect(orgCounts['CNCF']).toBe(1)
  })

  it('buckets unaffiliated authors separately', () => {
    const now = new Date()
    const nodes = [makeCommit('alice', null, 5)]
    const orgs = new Map([['alice', [] as string[]]])
    const result = buildExperimentalMetricsByWindow(nodes, orgs, now)
    const w90 = result[90]
    const orgCounts = w90.commitCountsByExperimentalOrg as Record<string, number>
    expect(orgCounts['Unaffiliated']).toBe(1)
  })
})
