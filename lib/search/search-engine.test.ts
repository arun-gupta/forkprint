import { describe, expect, it } from 'vitest'
import { executeSearch } from './search-engine'
import type { SearchIndex } from './types'

const index: SearchIndex = {
  overview: ['facebook/react', 'Stars: 230000', 'Activity score: High'],
  contributors: ['facebook/react', 'alice: 30 commits', 'Contributors score: Medium'],
  activity: ['facebook/react', 'PR merge rate: 87%', 'Commits (30d): 20', 'Stale issue ratio: 12%'],
  responsiveness: ['facebook/react', 'Issue first response (median): 4.2h', 'Responsiveness score: High'],
  documentation: ['facebook/react', 'README: found', 'LICENSE: MIT', 'CONTRIBUTING: found', 'SECURITY.md: not found'],
  security: ['facebook/react', 'SEC-3 Branch-Protection: High', 'SEC-6 Dependency-Update-Tool: Medium', 'OpenSSF Scorecard: 7.2/10'],
  recommendations: ['facebook/react', 'SEC-3: Enforce branch protection', 'ACT-1: Reduce PR backlog', 'Critical', 'High', 'Medium'],
  comparison: ['facebook/react', 'kubernetes/kubernetes', 'Stars', 'Forks'],
}

describe('executeSearch', () => {
  it('returns zero matches for empty query', () => {
    const result = executeSearch(index, '')
    expect(result.totalMatches).toBe(0)
    expect(result.matchedTabCount).toBe(0)
  })

  it('returns zero matches for whitespace-only query', () => {
    const result = executeSearch(index, '   ')
    expect(result.totalMatches).toBe(0)
    expect(result.matchedTabCount).toBe(0)
  })

  it('performs case-insensitive matching', () => {
    const result = executeSearch(index, 'critical')
    expect(result.totalMatches).toBeGreaterThan(0)

    const resultUpper = executeSearch(index, 'CRITICAL')
    expect(resultUpper.totalMatches).toBe(result.totalMatches)
  })

  it('counts matches per tab correctly', () => {
    const result = executeSearch(index, 'facebook/react')
    // facebook/react appears in all 8 tabs
    expect(result.matchedTabCount).toBe(8)
    expect(result.matchCounts.overview).toBe(1)
    expect(result.matchCounts.security).toBe(1)
  })

  it('counts multiple matches within a single tab', () => {
    const result = executeSearch(index, 'SEC-')
    // SEC-3 and SEC-6 in security, SEC-3 and ACT-1... wait, SEC- only in security (2) and recommendations (1)
    expect(result.matchCounts.security).toBe(2)
    expect(result.matchCounts.recommendations).toBe(1)
  })

  it('treats special regex characters as literal text', () => {
    const specialIndex: SearchIndex = {
      overview: ['version 1.0.0'],
      contributors: [],
      activity: [],
      responsiveness: [],
      documentation: [],
      security: [],
      recommendations: [],
      comparison: [],
    }
    // "1.0.0" should match literally, not as regex (where . matches any char)
    const result = executeSearch(specialIndex, '1.0.0')
    expect(result.matchCounts.overview).toBe(1)
  })

  it('matches substrings within entries', () => {
    const result = executeSearch(index, 'merge rate')
    expect(result.matchCounts.activity).toBe(1)
  })

  it('returns correct matchedTabCount', () => {
    const result = executeSearch(index, 'OpenSSF')
    expect(result.matchedTabCount).toBe(1)
    expect(result.matchCounts.security).toBe(1)
  })

  it('totalMatches equals sum of all tab match counts', () => {
    const result = executeSearch(index, 'High')
    const sum = Object.values(result.matchCounts).reduce((a, b) => a + b, 0)
    expect(result.totalMatches).toBe(sum)
  })
})
