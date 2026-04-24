import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { orgAffiliationsAggregator } from './org-affiliations'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('orgAffiliationsAggregator — FR-010', () => {
  it('typical: unions org commits across 3 repos and sums author counts', () => {
    const results = [
      partialResult('o/alpha', {
        commitCountsByExperimentalOrg: { Google: 40, Microsoft: 10 },
        experimentalAttributedAuthors90d: 5,
        experimentalUnattributedAuthors90d: 2,
      }),
      partialResult('o/bravo', {
        commitCountsByExperimentalOrg: { Google: 20, RedHat: 15 },
        experimentalAttributedAuthors90d: 3,
        experimentalUnattributedAuthors90d: 1,
      }),
      partialResult('o/charlie', {
        commitCountsByExperimentalOrg: { Microsoft: 5 },
        experimentalAttributedAuthors90d: 2,
        experimentalUnattributedAuthors90d: 0,
      }),
    ]
    const panel = orgAffiliationsAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()

    // Sorted descending by commits: Google 60, RedHat 15, Microsoft 15
    const perOrg = panel.value!.perOrg
    expect(perOrg[0]).toEqual({ org: 'Google', commits: 60 })
    // Microsoft and RedHat both have 15; order is stable from Map iteration
    expect(perOrg.map((e) => e.org)).toContain('Microsoft')
    expect(perOrg.map((e) => e.org)).toContain('RedHat')
    expect(perOrg.find((e) => e.org === 'Microsoft')!.commits).toBe(15)
    expect(perOrg.find((e) => e.org === 'RedHat')!.commits).toBe(15)

    expect(panel.value!.attributedAuthorCount).toBe(10)
    expect(panel.value!.unattributedAuthorCount).toBe(3)
  })

  it('all-unavailable: every repo lacks org data → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { commitCountsByExperimentalOrg: 'unavailable' }),
      partialResult('o/bravo', { commitCountsByExperimentalOrg: 'unavailable' }),
    ]
    const panel = orgAffiliationsAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos are excluded but available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', {
        commitCountsByExperimentalOrg: { Google: 30 },
        experimentalAttributedAuthors90d: 4,
        experimentalUnattributedAuthors90d: 1,
      }),
      partialResult('o/bravo', { commitCountsByExperimentalOrg: 'unavailable' }),
      partialResult('o/charlie', {
        commitCountsByExperimentalOrg: { RedHat: 10 },
        experimentalAttributedAuthors90d: 'unavailable',
        experimentalUnattributedAuthors90d: 'unavailable',
      }),
    ]
    const panel = orgAffiliationsAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.perOrg).toEqual([
      { org: 'Google', commits: 30 },
      { org: 'RedHat', commits: 10 },
    ])
    // Only alpha's author counts are numeric; charlie's are 'unavailable'
    expect(panel.value!.attributedAuthorCount).toBe(4)
    expect(panel.value!.unattributedAuthorCount).toBe(1)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = orgAffiliationsAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
