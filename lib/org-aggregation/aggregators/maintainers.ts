import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, MaintainersValue } from './types'

/**
 * FR-009: Project-wide deduplicated maintainer union plus per-repo
 * breakdown. Team handles (`@org/team-name`) are preserved as single
 * tokens — not expanded to member logins.
 *
 * Pure function. No I/O. Repos whose `maintainerTokens` is 'unavailable'
 * are excluded from the union; the run is still 'final' if at least one
 * repo has tokens.
 */
export const maintainersAggregator: Aggregator<MaintainersValue> = (
  results,
  context,
): AggregatePanel<MaintainersValue> => {
  if (results.length === 0) {
    return {
      panelId: 'maintainers',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  // token -> { token, kind, reposListed: Set<repo> }
  const union = new Map<string, { token: string; kind: 'user' | 'team'; reposListed: Set<string> }>()
  const perRepo: MaintainersValue['perRepo'] = []

  for (const r of results) {
    const tokens = (r as AnalysisResult).maintainerTokens
    if (!tokens || tokens === 'unavailable') continue

    const repoTokens = new Map<string, { token: string; kind: 'user' | 'team' }>()
    for (const t of tokens) {
      if (!repoTokens.has(t.token)) repoTokens.set(t.token, { token: t.token, kind: t.kind })

      const existing = union.get(t.token)
      if (!existing) {
        union.set(t.token, { token: t.token, kind: t.kind, reposListed: new Set([r.repo]) })
      } else {
        existing.reposListed.add(r.repo)
        // If we've seen this token as both kinds (shouldn't happen in
        // practice — '/'-containing tokens are unambiguously team), prefer
        // 'team' since it's the more specific assertion.
        if (existing.kind === 'user' && t.kind === 'team') existing.kind = 'team'
      }
    }
    perRepo.push({ repo: r.repo, tokens: Array.from(repoTokens.values()) })
  }

  const contributingReposCount = perRepo.length
  if (contributingReposCount === 0) {
    return {
      panelId: 'maintainers',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  const projectWide: MaintainersValue['projectWide'] = Array.from(union.values())
    .map((e) => ({ token: e.token, kind: e.kind, reposListed: Array.from(e.reposListed) }))
    .sort((a, b) => b.reposListed.length - a.reposListed.length || a.token.localeCompare(b.token))

  return {
    panelId: 'maintainers',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      projectWide,
      perRepo,
    },
  }
}
