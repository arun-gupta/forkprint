import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildResult } from '@/lib/testing/fixtures'
import {
  aggregateRecommendationEntries,
  orgRecommendationsAggregator,
  type FlatRepoRecommendation,
} from './org-recommendations'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('aggregateRecommendationEntries — dedup / sort / group (FR-004 — FR-011, FR-019)', () => {
  it('returns empty items when no per-repo recs present', () => {
    const value = aggregateRecommendationEntries([], 0)
    expect(value).toEqual({ items: [], analyzedReposCount: 0 })
  })

  it('single repo with one cataloged rec → one entry, count 1, resolved catalog title', () => {
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/alpha', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: 'missing README' },
    ]
    const value = aggregateRecommendationEntries(flat, 1)
    expect(value.analyzedReposCount).toBe(1)
    expect(value.items).toHaveLength(1)
    const entry = value.items[0]
    expect(entry.id).toBe('DOC-1')
    expect(entry.bucket).toBe('Documentation')
    expect(entry.title).toBe('Add a README') // catalog title wins over sourceTitle
    expect(entry.affectedRepoCount).toBe(1)
    expect(entry.affectedRepos).toEqual(['o/alpha'])
  })

  it('two repos same rec → one entry count 2, repos alphabetized (FR-005, FR-009)', () => {
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/charlie', rawKey: 'file:security', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/alpha', rawKey: 'file:security', sourceBucket: 'Documentation', sourceTitle: '' },
    ]
    const value = aggregateRecommendationEntries(flat, 2)
    expect(value.items).toHaveLength(1)
    expect(value.items[0].id).toBe('DOC-5')
    expect(value.items[0].affectedRepoCount).toBe(2)
    expect(value.items[0].affectedRepos).toEqual(['o/alpha', 'o/charlie'])
  })

  it('case-insensitive alphabetical ordering of affectedRepos', () => {
    const flat: FlatRepoRecommendation[] = [
      { repo: 'Org/Zeta', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'org/alpha', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'Org/beta', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
    ]
    const value = aggregateRecommendationEntries(flat, 3)
    expect(value.items[0].affectedRepos).toEqual(['org/alpha', 'Org/beta', 'Org/Zeta'])
  })

  it('same repo emits the same rec twice → still counts as one affected repo', () => {
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/alpha', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/alpha', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
    ]
    const value = aggregateRecommendationEntries(flat, 1)
    expect(value.items[0].affectedRepoCount).toBe(1)
    expect(value.items[0].affectedRepos).toEqual(['o/alpha'])
  })

  it('direct-check alias dedups to the same catalog entry (FR-005)', () => {
    // "branch_protection" (direct-check form) and "Branch-Protection"
    // (Scorecard form) both resolve to SEC-3.
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/alpha', rawKey: 'Branch-Protection', sourceBucket: 'Security', sourceTitle: '' },
      { repo: 'o/bravo', rawKey: 'branch_protection', sourceBucket: 'Security', sourceTitle: '' },
    ]
    const value = aggregateRecommendationEntries(flat, 2)
    expect(value.items).toHaveLength(1)
    expect(value.items[0].id).toBe('SEC-3')
    expect(value.items[0].affectedRepoCount).toBe(2)
    expect(value.items[0].affectedRepos).toEqual(['o/alpha', 'o/bravo'])
  })

  it('uncataloged key survives with UNCAT:<key> id (FR-019)', () => {
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/alpha', rawKey: 'dynamic-insight-42', sourceBucket: 'Activity', sourceTitle: 'Dynamic advice' },
    ]
    const value = aggregateRecommendationEntries(flat, 1)
    expect(value.items).toHaveLength(1)
    expect(value.items[0].id).toBe('UNCAT:dynamic-insight-42')
    expect(value.items[0].title).toBe('Dynamic advice')
    expect(value.items[0].bucket).toBe('Activity')
  })

  it('sort: higher count first, catalog id asc as tiebreaker (FR-007, SC-003)', () => {
    // SEC-3 affects 2 repos; SEC-14 affects 2 repos; DOC-5 affects 3 repos.
    // Within Documentation: DOC-5 (count 3).
    // Within Security: SEC-3 (count 2) before SEC-14 (count 2) by id asc.
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/a', rawKey: 'file:security', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/b', rawKey: 'file:security', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/c', rawKey: 'file:security', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/a', rawKey: 'Branch-Protection', sourceBucket: 'Security', sourceTitle: '' },
      { repo: 'o/b', rawKey: 'Branch-Protection', sourceBucket: 'Security', sourceTitle: '' },
      { repo: 'o/a', rawKey: 'Security-Policy', sourceBucket: 'Security', sourceTitle: '' },
      { repo: 'o/b', rawKey: 'Security-Policy', sourceBucket: 'Security', sourceTitle: '' },
    ]
    const value = aggregateRecommendationEntries(flat, 3)
    const ids = value.items.map((i) => i.id)
    // Bucket order: Documentation before Security.
    // DOC-5 first in its bucket.
    // Within Security: SEC-3 before SEC-14 (equal counts of 2, id asc).
    expect(ids).toEqual(['DOC-5', 'SEC-3', 'SEC-14'])
  })

  it('bucket pre-order matches ORG_RECOMMENDATION_BUCKET_ORDER', () => {
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/a', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/a', rawKey: 'pr_flow', sourceBucket: 'Activity', sourceTitle: '' },
      { repo: 'o/a', rawKey: 'Branch-Protection', sourceBucket: 'Security', sourceTitle: '' },
      { repo: 'o/a', rawKey: 'response_time', sourceBucket: 'Responsiveness', sourceTitle: '' },
      { repo: 'o/a', rawKey: 'contributor_diversity', sourceBucket: 'Contributors', sourceTitle: '' },
    ]
    const value = aggregateRecommendationEntries(flat, 1)
    expect(value.items.map((i) => i.bucket)).toEqual([
      'Activity',
      'Responsiveness',
      'Contributors',
      'Documentation',
      'Security',
    ])
  })

  it('affectedRepos.length always equals affectedRepoCount (invariant)', () => {
    const flat: FlatRepoRecommendation[] = [
      { repo: 'o/a', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/b', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
      { repo: 'o/c', rawKey: 'file:readme', sourceBucket: 'Documentation', sourceTitle: '' },
    ]
    const value = aggregateRecommendationEntries(flat, 3)
    for (const entry of value.items) {
      expect(entry.affectedRepos).toHaveLength(entry.affectedRepoCount)
    }
  })
})

describe('orgRecommendationsAggregator — panel wrapper (FR-002, FR-011, FR-013)', () => {
  it('empty results → in-progress panel with null value', () => {
    const panel = orgRecommendationsAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
    expect(panel.totalReposInRun).toBe(3)
  })

  it('clean results (no recommendations) → final panel with empty items', () => {
    // A result with maintainerCount set (not 'unavailable') and every
    // percentile source unavailable produces no getHealthScore
    // recommendations. securityResult === 'unavailable' means getSecurityScore
    // is skipped entirely.
    const results = [
      partialResult('o/alpha', { maintainerCount: 2 }),
      partialResult('o/bravo', { maintainerCount: 2 }),
    ]
    const panel = orgRecommendationsAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.items).toEqual([])
    expect(panel.value!.analyzedReposCount).toBe(2)
  })

  it('analyzedReposCount == results.length (FR-011)', () => {
    const results = [
      partialResult('o/a', { maintainerCount: 1 }),
      partialResult('o/b', { maintainerCount: 1 }),
      partialResult('o/c', { maintainerCount: 1 }),
    ]
    const panel = orgRecommendationsAggregator(results, { ...CONTEXT, totalReposInRun: 5 })
    expect(panel.value!.analyzedReposCount).toBe(3)
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.totalReposInRun).toBe(5)
  })
})
